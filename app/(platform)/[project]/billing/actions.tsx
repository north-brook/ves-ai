"use server";

import { PLANS } from "@/config/pricing";
import adminSupabase from "@/lib/supabase/admin";
import serverSupabase from "@/lib/supabase/server";
import { ProjectPlan } from "@/types";
import { redirect } from "next/navigation";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

type ActionResult = { success: boolean; error: string | null };

export async function checkout({
  projectId,
  plan,
}: {
  projectId: string;
  plan: ProjectPlan;
}): Promise<ActionResult> {
  const supabase = adminSupabase();

  // Get project data
  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, customer_id, subscription_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  // Get or create Stripe customer
  let customerId = project.customer_id;

  if (!customerId) {
    // Get user email from current session
    const userSupabase = await serverSupabase();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user?.email)
      return { success: false, error: "User not authenticated" };

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        projectId: project.id,
        userId: user.id,
      },
    });

    customerId = customer.id;

    // Update project with customer_id
    await supabase
      .from("projects")
      .update({ customer_id: customerId })
      .eq("id", project.id);
  }

  // Get price ID for the plan
  const planConfig = PLANS.find((p) => p.id === plan);
  if (!planConfig?.priceId)
    return { success: false, error: `No price ID found for plan: ${plan}` };

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_URL}/api/stripe/callback?session_id={CHECKOUT_SESSION_ID}&projectId=${projectId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/${project.slug}/billing`,
    client_reference_id: projectId,
    subscription_data: {
      metadata: {
        projectId: project.id,
      },
    },
  });

  if (!session.url)
    return { success: false, error: "Failed to create checkout session" };

  redirect(session.url);
}

export async function updatePaymentMethod({
  projectId,
}: {
  projectId: string;
}): Promise<ActionResult> {
  const supabase = adminSupabase();

  // Get project data
  const { data: project } = await supabase
    .from("projects")
    .select("slug, customer_id")
    .eq("id", projectId)
    .single();

  if (!project) return { success: false, error: "Project not found" };

  if (!project.customer_id)
    return { success: false, error: "No subscription found" };

  // Create Billing Portal Session (restricted to payment method updates)
  const session = await stripe.billingPortal.sessions.create({
    customer: project.customer_id,
    return_url: `${process.env.NEXT_PUBLIC_URL}/${project.slug}/billing`,
    flow_data: {
      type: "payment_method_update",
    },
  });

  redirect(session.url);
}

export async function upgrade({
  projectId,
  plan,
}: {
  projectId: string;
  plan: ProjectPlan;
}): Promise<ActionResult> {
  const supabase = adminSupabase();

  // Get project data
  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, customer_id, subscription_id")
    .eq("id", projectId)
    .single();

  if (!project) return { success: false, error: "Project not found" };

  if (!project.customer_id)
    return { success: false, error: "No customer found" };

  // Get price ID for the new plan
  const planConfig = PLANS.find((p) => p.id === plan);
  if (!planConfig?.priceId)
    return { success: false, error: `No price ID found for plan: ${plan}` };

  // If no existing subscription, use checkout
  if (!project.subscription_id) return checkout({ projectId, plan });

  // get subscription
  const subscription = await stripe.subscriptions.retrieve(
    project.subscription_id,
  );
  if (!subscription) return { success: false, error: "Subscription not found" };

  // Use billing portal with subscription update flow
  const session = await stripe.billingPortal.sessions.create({
    customer: project.customer_id,
    return_url: `${process.env.NEXT_PUBLIC_URL}/${project.slug}/billing`,
    flow_data: {
      type: "subscription_update_confirm",
      subscription_update_confirm: {
        subscription: project.subscription_id,
        items: [
          {
            id: subscription.items.data[0].id,
            price: planConfig.priceId,
            quantity: 1,
          },
        ],
      },
      after_completion: {
        type: "redirect",
        redirect: {
          return_url: `${process.env.NEXT_PUBLIC_URL}/${project.slug}/billing`,
        },
      },
    },
  });

  redirect(session.url);
}

export async function downgrade({
  projectId,
  plan,
}: {
  projectId: string;
  plan: ProjectPlan;
}): Promise<ActionResult> {
  const supabase = adminSupabase();

  // Get project data
  const { data: project } = await supabase
    .from("projects")
    .select("id, slug, customer_id, subscription_id")
    .eq("id", projectId)
    .single();

  if (!project) return { success: false, error: "Project not found" };

  if (!project.customer_id)
    return { success: false, error: "No customer found" };

  // Get price ID for the new plan
  const planConfig = PLANS.find((p) => p.id === plan);
  if (!planConfig?.priceId)
    return { success: false, error: `No price ID found for plan: ${plan}` };

  // If no existing subscription, return error (can't downgrade from starter)
  if (!project.subscription_id)
    return { success: false, error: "No active subscription to downgrade" };

  // get subscription
  const subscription = await stripe.subscriptions.retrieve(
    project.subscription_id,
  );
  if (!subscription) return { success: false, error: "Subscription not found" };

  // Use billing portal with subscription update flow
  const session = await stripe.billingPortal.sessions.create({
    customer: project.customer_id,
    return_url: `${process.env.NEXT_PUBLIC_URL}/${project.slug}/billing`,
    flow_data: {
      type: "subscription_update_confirm",
      subscription_update_confirm: {
        subscription: project.subscription_id,
        items: [
          {
            id: subscription.items.data[0].id,
            price: planConfig.priceId,
            quantity: 1,
          },
        ],
      },
      after_completion: {
        type: "redirect",
        redirect: {
          return_url: `${process.env.NEXT_PUBLIC_URL}/${project.slug}/billing`,
        },
      },
    },
  });

  redirect(session.url);
}

export async function cancel({
  projectId,
}: {
  projectId: string;
}): Promise<ActionResult> {
  const supabase = adminSupabase();

  // Get project data
  const { data: project } = await supabase
    .from("projects")
    .select("slug, customer_id, subscription_id")
    .eq("id", projectId)
    .single();

  if (!project) return { success: false, error: "Project not found" };

  if (!project.customer_id || !project.subscription_id)
    return { success: false, error: "No subscription found" };

  // Use billing portal with subscription cancel flow
  const session = await stripe.billingPortal.sessions.create({
    customer: project.customer_id,
    return_url: `${process.env.NEXT_PUBLIC_URL}/${project.slug}/billing`,
    flow_data: {
      type: "subscription_cancel",
      subscription_cancel: {
        subscription: project.subscription_id,
      },
      after_completion: {
        type: "redirect",
        redirect: {
          return_url: `${process.env.NEXT_PUBLIC_URL}/${project.slug}/billing`,
        },
      },
    },
  });

  redirect(session.url);
}
