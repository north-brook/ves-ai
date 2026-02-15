import { Database } from "@/schema";
import { ProjectPlan } from "@/types";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

// Supabase Admin client to bypass RLS
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, ProjectPlan> = {
  [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!]: "starter",
  [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID!]: "growth",
  [process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID!]: "scale",
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.error(
      "[Subscription Created] No price ID found in subscription items",
    );
    Sentry.captureException(
      new Error(
        `[Subscription Created] No price ID found in subscription items`,
      ),
    );
    throw new Error(
      `[Subscription Created] No price ID found in subscription items`,
    );
  }

  const plan = PRICE_TO_PLAN[priceId];
  if (!plan) {
    console.error(
      `[Subscription Created] Unknown price ID: ${priceId}. Skipping plan update.`,
    );
    Sentry.captureException(
      new Error(
        `[Subscription Created] Unknown price ID: ${priceId}. Skipping plan update.`,
      ),
    );
    throw new Error(
      `[Subscription Created] Unknown price ID: ${priceId}. Skipping plan update.`,
    );
  }

  console.log(
    `[Subscription Created] Upgrading customer ${customerId} to ${plan}`,
  );

  // Find project by customer_id and update
  const { data: project, error: findError } = await supabase
    .from("projects")
    .select("id")
    .eq("customer_id", customerId)
    .single();

  if (findError || !project) {
    console.error(
      `[Subscription Created] Project not found for customer ${customerId}:`,
      findError,
    );
    Sentry.captureException(
      new Error(
        `[Subscription Created] Project not found for customer ${customerId}`,
      ),
    );
    throw new Error(
      `[Subscription Created] Project not found for customer ${customerId}`,
    );
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      plan,
      subscription_id: subscriptionId,
      subscribed_at: new Date().toISOString(),
    })
    .eq("id", project.id);

  if (updateError) {
    console.error(
      `[Subscription Created] Failed to update project ${project.id}:`,
      updateError,
    );
    Sentry.captureException(updateError, {
      tags: { action: "handleSubscriptionCreated", step: "updateProject" },
      extra: {
        projectId: project.id,
        plan,
      },
    });
    throw new Error(
      `[Subscription Created] Failed to update project ${project.id}: ${updateError.message}`,
    );
  }
  console.log(
    `[Subscription Created] Successfully updated project ${project.id} to ${plan}`,
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]?.price.id;
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  console.log(
    `[Subscription Updated] Subscription ${subscriptionId} status: ${status}, cancel_at_period_end: ${cancelAtPeriodEnd}`,
  );

  // Find project by subscription_id
  const { data: project, error: findError } = await supabase
    .from("projects")
    .select("id, plan")
    .eq("subscription_id", subscriptionId)
    .single();

  if (findError || !project) {
    console.error(
      `[Subscription Updated] Project not found for subscription ${subscriptionId}:`,
      findError,
    );
    Sentry.captureException(
      new Error(
        `[Subscription Updated] Project not found for subscription ${subscriptionId}`,
      ),
    );
    throw new Error(
      `[Subscription Updated] Project not found for subscription ${subscriptionId}`,
    );
  }

  // If subscription is canceled but not yet expired, keep current plan
  // The subscription.deleted event will fire at period_end to downgrade
  if (cancelAtPeriodEnd) {
    console.log(
      `[Subscription Updated] Subscription ${subscriptionId} set to cancel at period end. Keeping current plan until then.`,
    );
    return;
  }

  if (!priceId || !PRICE_TO_PLAN[priceId]) {
    Sentry.captureException(
      new Error(
        `[Subscription Updated] No price ID found for subscription ${subscriptionId}`,
      ),
    );
    throw new Error(
      `[Subscription Updated] No price ID found for subscription ${subscriptionId}`,
    );
  }

  // Handle plan changes (upgrades/downgrades)

  const newPlan = PRICE_TO_PLAN[priceId];

  if (newPlan !== project.plan) {
    console.log(
      `[Subscription Updated] Changing plan from ${project.plan} to ${newPlan} for project ${project.id}`,
    );

    const { error: updateError } = await supabase
      .from("projects")
      .update({ plan: newPlan })
      .eq("id", project.id);

    if (updateError) {
      console.error(
        `[Subscription Updated] Failed to update project ${project.id}:`,
        updateError,
      );
      Sentry.captureException(updateError, {
        tags: { action: "handleSubscriptionUpdated", step: "updateProject" },
        extra: {
          projectId: project.id,
          newPlan,
        },
      });
      throw new Error(
        `[Subscription Updated] Failed to update project ${project.id}: ${updateError.message}`,
      );
    }
    console.log(
      `[Subscription Updated] Successfully updated project ${project.id} to ${newPlan}`,
    );
  }

  // Handle subscription status changes (e.g., past_due, unpaid)
  if (status === "past_due" || status === "unpaid") {
    console.log(
      `[Subscription Updated] Subscription ${subscriptionId} is ${status}. Consider grace period handling.`,
    );
    // Optional: Implement grace period logic here
    // For now, we keep the plan active until subscription.deleted fires
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  console.log(
    `[Subscription Deleted] Downgrading subscription ${subscriptionId} to starter plan`,
  );

  // Find project by subscription_id
  const { data: project, error: findError } = await supabase
    .from("projects")
    .select("id")
    .eq("subscription_id", subscriptionId)
    .single();

  if (findError || !project) {
    console.error(
      `[Subscription Deleted] Project not found for subscription ${subscriptionId}:`,
      findError,
    );
    Sentry.captureException(
      new Error(
        `[Subscription Deleted] Project not found for subscription ${subscriptionId}`,
      ),
    );
    throw new Error(
      `[Subscription Deleted] Project not found for subscription ${subscriptionId}`,
    );
  }

  // Downgrade to starter and clear subscription fields
  const { error: updateError } = await supabase
    .from("projects")
    .update({
      plan: "starter",
      subscription_id: null,
      subscribed_at: null,
    })
    .eq("id", project.id);

  if (updateError) {
    console.error(
      `[Subscription Deleted] Failed to downgrade project ${project.id}:`,
      updateError,
    );
    Sentry.captureException(updateError, {
      tags: { action: "handleSubscriptionDeleted", step: "updateProject" },
      extra: {
        projectId: project.id,
        plan: "starter",
      },
    });
    throw new Error(
      `[Subscription Deleted] Failed to downgrade project ${project.id}: ${updateError.message}`,
    );
  }

  console.log(
    `[Subscription Deleted] Successfully downgraded project ${project.id} to starter`,
  );
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Type assertion needed as subscription field exists but may not be in type def
  const invoiceSubscription = (invoice as any).subscription;
  const subscriptionId =
    typeof invoiceSubscription === "string"
      ? invoiceSubscription
      : (invoiceSubscription?.id ?? null);

  if (!subscriptionId) {
    console.log(
      "[Payment Succeeded] Invoice is not associated with a subscription. Skipping.",
    );
    return;
  }

  console.log(
    `[Payment Succeeded] Payment successful for subscription ${subscriptionId}`,
  );

  // Verify the project has the correct plan active
  const { data: project, error: findError } = await supabase
    .from("projects")
    .select("id, plan, subscription_id")
    .eq("subscription_id", subscriptionId)
    .single();

  if (findError || !project) {
    console.error(
      `[Payment Succeeded] Project not found for subscription ${subscriptionId}:`,
      findError,
    );
    Sentry.captureException(
      new Error(
        `[Payment Succeeded] Project not found for subscription ${subscriptionId}`,
      ),
    );
    throw new Error(
      `[Payment Succeeded] Project not found for subscription ${subscriptionId}`,
    );
  }

  // Fetch the subscription to get the current price
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId || !PRICE_TO_PLAN[priceId]) {
    Sentry.captureException(
      new Error(
        `[Payment Succeeded] No price ID found for subscription ${subscriptionId}`,
      ),
    );
    throw new Error(
      `[Payment Succeeded] No price ID found for subscription ${subscriptionId}`,
    );
  }

  const expectedPlan = PRICE_TO_PLAN[priceId];

  if (project.plan !== expectedPlan) {
    console.log(
      `[Payment Succeeded] Plan mismatch detected. Updating project ${project.id} from ${project.plan} to ${expectedPlan}`,
    );

    const { error: updateError } = await supabase
      .from("projects")
      .update({ plan: expectedPlan })
      .eq("id", project.id);

    if (updateError) {
      console.error(
        `[Payment Succeeded] Failed to update project ${project.id}:`,
        updateError,
      );
      Sentry.captureException(updateError, {
        tags: { action: "handlePaymentSucceeded", step: "updateProject" },
        extra: {
          projectId: project.id,
          expectedPlan,
          currentPlan: project.plan,
        },
      });
      throw new Error(
        `[Payment Succeeded] Failed to update project ${project.id}: ${updateError.message}`,
      );
    }

    console.log(
      `[Payment Succeeded] Successfully updated project ${project.id} to ${expectedPlan}`,
    );
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Type assertion needed as subscription field exists but may not be in type def
  const invoiceSubscription = (invoice as any).subscription;
  const subscriptionId =
    typeof invoiceSubscription === "string"
      ? invoiceSubscription
      : (invoiceSubscription?.id ?? null);

  if (!subscriptionId) {
    console.log(
      "[Payment Failed] Invoice is not associated with a subscription. Skipping.",
    );
    Sentry.captureException(
      new Error(
        `[Payment Failed] Invoice is not associated with a subscription. Skipping.`,
      ),
    );
    throw new Error(
      `[Payment Failed] Invoice is not associated with a subscription. Skipping.`,
    );
  }

  console.log(
    `[Payment Failed] Payment failed for subscription ${subscriptionId}`,
  );

  // Find project by subscription_id
  const { data: project } = await supabase
    .from("projects")
    .select("id, plan")
    .eq("subscription_id", subscriptionId)
    .single();

  if (!project) {
    console.error(
      `[Payment Failed] Project not found for subscription ${subscriptionId}`,
    );
    Sentry.captureException(
      new Error(
        `[Payment Failed] Project not found for subscription ${subscriptionId}`,
      ),
    );
    throw new Error(
      `[Payment Failed] Project not found for subscription ${subscriptionId}`,
    );
  }

  console.log(
    `[Payment Failed] Project ${project.id} has failed payment. Current plan: ${project.plan}`,
  );
}
