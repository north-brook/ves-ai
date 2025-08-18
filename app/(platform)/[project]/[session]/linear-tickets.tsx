"use client";

import { ExternalLink, CheckCircle, Circle, AlertCircle } from "lucide-react";
import { Ticket } from "@/types";
import Link from "next/link";

export function LinearTickets({ tickets }: { tickets: Ticket[] }) {
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Circle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "urgent":
        return "text-red-500 bg-red-500/10";
      case "high":
        return "text-orange-500 bg-orange-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "low":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-foreground-secondary bg-surface-secondary";
    }
  };

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="border-border bg-background hover:bg-surface/50 rounded-lg border p-3 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(ticket.status)}
                <h4 className="text-foreground text-sm font-medium">
                  {ticket.name}
                </h4>
              </div>

              {ticket.description && (
                <p className="text-foreground-secondary mt-1 line-clamp-2 text-xs">
                  {ticket.description}
                </p>
              )}
            </div>

            {ticket.url && (
              <Link
                href={ticket.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground-secondary hover:bg-surface hover:text-foreground ml-2 rounded p-1 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      ))}

      {tickets.length === 0 && (
        <p className="text-foreground-secondary text-center text-sm">
          No tickets linked to this session
        </p>
      )}
    </div>
  );
}
