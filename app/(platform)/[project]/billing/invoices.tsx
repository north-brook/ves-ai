"use client";

import { useMutation } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import Stripe from "stripe";
import { updatePaymentMethod } from "./actions";

export default function Invoices({
  invoices,
  paymentMethod,
  projectId,
}: {
  invoices: Stripe.Invoice[];
  paymentMethod: Stripe.PaymentMethod | null;
  projectId: string;
}) {
  const updatePaymentMethodMutation = useMutation({
    mutationFn: () => updatePaymentMethod({ projectId }),
    onSettled: (_data, error) => {
      if (error) {
        toast.error(error.message || "Failed to update payment method");
      }
    },
  });

  // Format payment method display
  const paymentMethodDisplay = paymentMethod?.card
    ? `${paymentMethod.card.brand.replace("_", " ").toUpperCase()} ${paymentMethod.card.last4}`
    : "No payment method";

  return (
    <section className="w-full max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Invoices
        </h2>
        <button
          onClick={() => updatePaymentMethodMutation.mutate()}
          disabled={updatePaymentMethodMutation.isPending}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {paymentMethodDisplay}
          {updatePaymentMethodMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
        </button>
      </div>
      {!!invoices.length ? (
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
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-800 dark:text-slate-200">
                    {new Date(invoice.created * 1000).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-slate-800 dark:text-slate-200">
                    {(invoice.amount_paid / 100).toFixed(2)}{" "}
                    <span className="text-slate-600 uppercase dark:text-slate-400">
                      {invoice.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-400">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                    {invoice.invoice_pdf ? (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:underline dark:text-slate-400"
                      >
                        View PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-slate-600 dark:text-slate-400">
          No invoices yet.
        </div>
      )}
    </section>
  );
}
