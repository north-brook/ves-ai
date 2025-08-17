"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  currentStep: number;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const steps = [
    { number: 1, label: "Setup" },
    { number: 2, label: "PostHog" },
    { number: 3, label: "Linear" },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  step.number < currentStep
                    ? "border-accent-purple bg-accent-purple text-white"
                    : step.number === currentStep
                      ? "border-accent-purple bg-background text-accent-purple"
                      : "border-border bg-background text-foreground-secondary",
                )}
              >
                {step.number < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  step.number <= currentStep
                    ? "text-foreground"
                    : "text-foreground-secondary",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="relative mx-4 w-16 md:w-24">
                <div className="absolute top-5 h-[2px] w-full bg-border" />
                <div
                  className={cn(
                    "absolute top-5 h-[2px] bg-gradient-to-r from-accent-purple to-accent-pink transition-all duration-500",
                    step.number < currentStep ? "w-full" : "w-0",
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
