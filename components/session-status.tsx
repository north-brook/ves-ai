"use client";

import { Session } from "@/types";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Brain,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface SessionStatusProps {
  session: Session;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showProgress?: boolean;
}

export function SessionStatusBadge({
  session,
  size = "md",
  showLabel = true,
}: SessionStatusProps) {
  const [progress, setProgress] = useState(0);

  const showProgress =
    session.status === "processing" || session.status === "analyzing";

  useEffect(() => {
    if (!showProgress) {
      setProgress(0);
      return;
    }

    const calculateProgress = () => {
      const startTime = new Date(
        session.analyzed_at || session.processed_at || session.created_at,
      ).getTime();
      const now = Date.now();
      const elapsed = (now - startTime) / 1000; // Convert to seconds

      if (session.status === "processing") {
        // Processing should take ~active_duration + 30 seconds
        const estimatedDuration = (session.active_duration || 60) + 30;
        return Math.min((elapsed / estimatedDuration) * 90, 90); // Max 90%
      } else if (session.status === "analyzing") {
        // Analyzing should take ~5 minutes
        const estimatedDuration = 300; // 5 minutes
        return Math.min((elapsed / estimatedDuration) * 90, 90); // Max 90%
      }
      return 0;
    };

    // Initial calculation
    setProgress(calculateProgress());

    // Update progress every 100ms
    const interval = setInterval(() => {
      setProgress(calculateProgress());
    }, 100);

    return () => clearInterval(interval);
  }, [
    session.status,
    session.created_at,
    session.active_duration,
    showProgress,
  ]);
  const getStatusConfig = () => {
    switch (session.status) {
      case "pending":
        return {
          icon: Clock,
          label: "Pending",
          color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
          isLoading: true,
        };
      case "processing":
        return {
          icon: Loader2,
          label: "Processing",
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
          isLoading: true,
        };
      case "processed":
        return {
          icon: Zap,
          label: "Processed",
          color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
          isLoading: true,
        };
      case "analyzing":
        return {
          icon: Brain,
          label: "Analyzing",
          color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
          isLoading: true,
        };
      case "analyzed":
        return {
          icon: CheckCircle,
          label: "Analyzed",
          color: "text-green-500 bg-green-500/10 border-green-500/20",
          isLoading: false,
        };
      case "failed":
        return {
          icon: XCircle,
          label: "Failed",
          color: "text-red-500 bg-red-500/10 border-red-500/20",
          isLoading: false,
        };
      default:
        return {
          icon: AlertCircle,
          label: "Unknown",
          color: "text-gray-500 bg-gray-500/10 border-gray-500/20",
          isLoading: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: "px-2 py-0.5 text-xs",
      icon: "h-3 w-3",
      gap: "gap-1",
    },
    md: {
      container: "px-2 py-1 text-xs",
      icon: "h-3.5 w-3.5",
      gap: "gap-1.5",
    },
    lg: {
      container: "px-3 py-1.5 text-sm",
      icon: "h-4 w-4",
      gap: "gap-2",
    },
  };

  const sizes = sizeClasses[size];

  const showProgressBar =
    showProgress &&
    (session.status === "processing" || session.status === "analyzing");

  const getProgressColor = () => {
    switch (session.status) {
      case "processing":
        return "bg-blue-500";
      case "analyzing":
        return "bg-purple-500";
      default:
        return "";
    }
  };

  return (
    <span
      className={cn(
        "relative inline-flex items-center overflow-hidden rounded-full border font-medium transition-all",
        config.color,
        sizes.container,
        sizes.gap,
      )}
    >
      {showProgressBar && (
        <div
          className={cn(
            "absolute inset-0 opacity-20 transition-all duration-300",
            getProgressColor(),
          )}
          style={{ width: `${progress}%` }}
        />
      )}
      <div className="relative flex items-center gap-1">
        <Icon
          className={cn(
            sizes.icon,
            config.label === "Processing" && "animate-spin",
          )}
        />
        {showLabel && <span>{config.label}</span>}
      </div>
    </span>
  );
}
