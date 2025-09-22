"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
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
                      : "border-border bg-background text-slate-600 dark:text-slate-400",
                )}
              >
                {step.number < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="relative mx-4 w-16 md:w-24">
                <div className="bg-border absolute top-0 h-[2px] w-full" />
                <div
                  className={cn(
                    "from-accent-purple to-accent-pink absolute h-[2px] bg-gradient-to-r transition-all duration-500",
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
