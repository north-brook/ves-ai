import { IssueConfidence, IssuePriority, IssueType } from "@/types";
import {
  AlertOctagon,
  Archive,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Bug,
  Info,
  LucideIcon,
  MousePointer,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export function getIssueIcon(type: IssueType): LucideIcon {
  switch (type) {
    case "bug":
      return Bug;
    case "usability":
      return MousePointer;
    case "improvement":
      return TrendingUp;
    case "feature":
      return Sparkles;
    default:
      return Info;
  }
}

export function getIssueConfidenceIcon(
  confidence: IssueConfidence,
): LucideIcon {
  switch (confidence) {
    case "high":
      return BatteryFull;
    case "medium":
      return BatteryMedium;
    case "low":
      return BatteryLow;
  }
}

export function getIssuePriorityIcon(priority: IssuePriority): LucideIcon {
  switch (priority) {
    case "immediate":
      return AlertOctagon;
    case "high":
      return SignalHigh;
    case "medium":
      return SignalMedium;
    case "low":
      return SignalLow;
    case "backlog":
      return Archive;
  }
}
