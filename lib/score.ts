import { Issue } from "@/types";

// Calculate score color (HSL gradient from red to green)
export function getScoreColor(score: number | null, opacity: number = 1) {
  // Hue goes from 0 (red) to 120 (green)
  const hue = ((score || 0) / 100) * 120;
  return `hsl(${hue}, 70%, 50%, ${opacity} )`;
}

export function calculateIssueScore(
  issue: Pick<Issue, "severity" | "confidence">,
): number {
  let severityScore = 0;
  let confidenceScore = 0;

  switch (issue.severity) {
    case "critical":
      severityScore = 1;
      break;
    case "high":
      severityScore = 0.8;
      break;
    case "medium":
      severityScore = 0.6;
      break;
    case "low":
      severityScore = 0.4;
      break;
    case "suggestion":
      severityScore = 0.2;
      break;
  }

  switch (issue.confidence) {
    case "high":
      confidenceScore = 1;
      break;
    case "medium":
      confidenceScore = 0.8;
      break;
    case "low":
      confidenceScore = 0.6;
      break;
  }

  return severityScore * confidenceScore * 100;
}

type RGB = { r: number; g: number; b: number };

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function mixRgb(start: RGB, end: RGB, t: number): RGB {
  return {
    r: Math.round(start.r + (end.r - start.r) * t),
    g: Math.round(start.g + (end.g - start.g) * t),
    b: Math.round(start.b + (end.b - start.b) * t),
  };
}

function rgbCss({ r, g, b }: RGB, opacity: number): string {
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Calculate issue score color: from slate-100 (light) / slate-900 (dark) to red-500
export function getIssueScoreColor(
  issue: Pick<Issue, "severity" | "confidence">,
  opacity: number = 1,
) {
  const t = clamp01((calculateIssueScore(issue) || 0) / 100);

  const lightStart = hexToRgb("#f1f5f9"); // slate-100
  const darkStart = hexToRgb("#0f172a"); // slate-900
  const end = hexToRgb("#ef4444"); // red-500

  const lightMixed = mixRgb(lightStart, end, t);
  const darkMixed = mixRgb(darkStart, end, t);

  return `light-dark(${rgbCss(lightMixed, opacity)}, ${rgbCss(darkMixed, opacity)})`;
}
