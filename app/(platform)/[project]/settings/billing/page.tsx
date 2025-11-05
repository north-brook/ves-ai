import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Stripe from "stripe";
import Invoices from "./invoices";
import Plans from "./plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string }>;
}): Promise<Metadata> {
  const { project: projectSlug } = await params;
  const supabase = await serverSupabase();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("slug", projectSlug)
    .single();

  const projectName = project?.name || "Project";

  return {
    title: `Billing • ${projectName} • VES AI`,
  };
}

export default async function ProjectBillingPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", projectSlug)
    .single();

  if (projectError) console.error(projectError);
  if (!project) redirect("/home");

  return (
    <main className="flex h-full w-full flex-col items-center justify-start gap-10 px-4 py-16">
      <Suspense fallback={<PlansSkeleton />}>
        <LoadedPlans projectSlug={projectSlug} />
      </Suspense>

      <Suspense fallback={<InvoicesSkeleton />}>
        <LoadedInvoices projectSlug={projectSlug} />
      </Suspense>
    </main>
  );
}

async function LoadedPlans({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, plan, customer_id, subscription_id")
    .eq("slug", projectSlug)
    .single();
  if (!project) throw new Error("Project not found");
  return <Plans project={project} />;
}

async function PlansSkeleton() {
  return (
    <section className="w-full max-w-6xl">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="mt-px border border-slate-200 rounded-2xl bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col items-stretch justify-start gap-4">
              {/* Plan name */}
              <div className="bg-slate-100 h-8 w-32 animate-pulse rounded dark:bg-slate-900" />

              {/* Price */}
              <div className="space-y-1">
                <div className="bg-slate-100 h-10 w-40 animate-pulse rounded dark:bg-slate-900" />
              </div>

              {/* Sessions and workers info */}
              <div className="space-y-2 border-y border-slate-200 py-4 dark:border-slate-800">
                <div className="bg-slate-100 h-5 w-full animate-pulse rounded dark:bg-slate-900" />
                <div className="bg-slate-100 h-5 w-3/4 animate-pulse rounded dark:bg-slate-900" />
              </div>

              {/* Description */}
              <div className="bg-slate-100 h-10 w-full animate-pulse rounded dark:bg-slate-900" />

              {/* Button */}
              <div className="mt-auto w-full">
                <div className="bg-slate-100 mt-[2px] h-12 w-full animate-pulse rounded-lg dark:bg-slate-900" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function LoadedInvoices({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id, customer_id, subscription_id")
    .eq("slug", projectSlug)
    .single();

  if (!project || !project.customer_id || !project.subscription_id) return null;

  // Fetch invoices and payment method from Stripe
  const [invoices, subscription] = await Promise.all([
    stripe.invoices.list({
      customer: project.customer_id,
      limit: 100,
    }),
    stripe.subscriptions.retrieve(project.subscription_id, {
      expand: ["default_payment_method"],
    }),
  ]);

  return (
    <Invoices
      invoices={invoices.data}
      paymentMethod={
        typeof subscription.default_payment_method === "string"
          ? null
          : subscription.default_payment_method
      }
      projectId={project.id}
    />
  );
}

export function InvoicesSkeleton() {
  return (
    <section className="w-full max-w-6xl">
      {/* Header with title and payment method button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="bg-slate-100 h-8 w-32 animate-pulse rounded dark:bg-slate-900" />
        <div className="bg-slate-100 h-10 w-48 animate-pulse rounded-lg dark:bg-slate-900" />
      </div>

      {/* Invoices table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-600 uppercase dark:text-slate-400">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-600 uppercase dark:text-slate-400">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-600 uppercase dark:text-slate-400">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-slate-600 uppercase dark:text-slate-400">
                Invoice
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <div className="bg-slate-100 h-5 w-24 animate-pulse rounded dark:bg-slate-900" />
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <div className="bg-slate-100 h-5 w-20 animate-pulse rounded dark:bg-slate-900" />
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <div className="bg-slate-100 h-6 w-16 animate-pulse rounded-full dark:bg-slate-900" />
                </td>
                <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                  <div className="bg-slate-100 ml-auto h-5 w-20 animate-pulse rounded dark:bg-slate-900" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
