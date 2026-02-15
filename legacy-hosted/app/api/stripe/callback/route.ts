import { Database } from "@/schema";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
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
const PRICE_TO_PLAN: Record<
  string,
  "starter" | "growth" | "scale" | "enterprise"
> = {
  [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!]: "starter",
  [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID!]: "growth",
  [process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID!]: "scale",
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("session_id");
  const projectId = searchParams.get("projectId");

  if (!sessionId || !projectId) {
    console.error("[Billing Callback] Missing session_id or projectId");
    Sentry.captureException(
      new Error("Billing callback missing session_id or projectId"),
    );
    // Redirect to home on error
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_URL!));
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "line_items"],
    });

    if (!session) {
      throw new Error("Checkout session not found");
    }

    // Get project slug for redirect
    const { data: project } = await supabase
      .from("projects")
      .select("slug, subscription_id, plan")
      .eq("id", projectId)
      .single();

    if (!project) {
      throw new Error("Project not found");
    }

    // Extract subscription ID
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      console.error("[Billing Callback] No subscription in session");
      // Still redirect to billing page even if no subscription
      return NextResponse.redirect(
        new URL(
          `/${project.slug}/settings/billing`,
          process.env.NEXT_PUBLIC_URL!,
        ),
      );
    }

    // Get price ID from line items
    const priceId = session.line_items?.data[0]?.price?.id;
    const plan = priceId ? PRICE_TO_PLAN[priceId] : null;

    // Update project if webhook hasn't already
    if (
      project.subscription_id !== subscriptionId ||
      (plan && project.plan !== plan)
    ) {
      const updateData: {
        subscription_id: string;
        plan?: "starter" | "growth" | "scale" | "enterprise";
        subscribed_at?: string;
      } = {
        subscription_id: subscriptionId,
      };

      if (
        plan &&
        (plan === "starter" ||
          plan === "growth" ||
          plan === "scale" ||
          plan === "enterprise")
      ) {
        updateData.plan = plan;
      }

      // Set subscribed_at if this is first subscription
      if (!project.subscription_id) {
        updateData.subscribed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId);

      if (error) {
        console.error("[Billing Callback] Failed to update project:", error);
        Sentry.captureException(error, {
          tags: { action: "billingCallback" },
          extra: { projectId, subscriptionId },
        });
      } else {
        console.log(
          `[Billing Callback] Updated project ${projectId} with subscription ${subscriptionId}`,
        );
      }
    }

    // Revalidate billing page to show new plan
    revalidatePath(`/${project.slug}/settings/billing`, "page");

    // Redirect to billing page
    return NextResponse.redirect(
      new URL(
        `/${project.slug}/settings/billing`,
        process.env.NEXT_PUBLIC_URL!,
      ),
    );
  } catch (error) {
    console.error("[Billing Callback] Error:", error);
    Sentry.captureException(error, {
      tags: { action: "billingCallback" },
      extra: { sessionId, projectId },
    });

    // Try to get project slug for redirect, otherwise go to home
    const { data: project } = await supabase
      .from("projects")
      .select("slug")
      .eq("id", projectId)
      .single();

    const redirectUrl = project ? `/${project.slug}/settings/billing` : "/";

    return NextResponse.redirect(
      new URL(redirectUrl, process.env.NEXT_PUBLIC_URL!),
    );
  }
}
