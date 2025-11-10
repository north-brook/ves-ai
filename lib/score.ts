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

// Mix RGB through multiple color stops
function mixRgbMultiStop(colors: RGB[], t: number): RGB {
  if (colors.length < 2) return colors[0];

  const segments = colors.length - 1;
  const scaledT = t * segments;
  const segment = Math.min(Math.floor(scaledT), segments - 1);
  const localT = scaledT - segment;

  return mixRgb(colors[segment], colors[segment + 1], localT);
}

function rgbCss({ r, g, b }: RGB, opacity: number): string {
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Calculate issue score color: neutral → yellow → orange → red
export function getIssueScoreColor(
  issue: Pick<Issue, "severity" | "confidence">,
  opacity: number = 1,
) {
  const t = clamp01((calculateIssueScore(issue) || 0) / 100);

  // Light mode: slate-100 → yellow-400 → orange-500 → red-500
  const lightStops = [
    hexToRgb("#f1f5f9"), // slate-100
    hexToRgb("#facc15"), // yellow-400
    hexToRgb("#f97316"), // orange-500
    hexToRgb("#ef4444"), // red-500
  ];

  // Dark mode: slate-900 → yellow-600 → orange-600 → red-500
  const darkStops = [
    hexToRgb("#0f172a"), // slate-900
    hexToRgb("#ca8a04"), // yellow-600
    hexToRgb("#ea580c"), // orange-600
    hexToRgb("#ef4444"), // red-500
  ];

  const lightMixed = mixRgbMultiStop(lightStops, t);
  const darkMixed = mixRgbMultiStop(darkStops, t);

  return `light-dark(${rgbCss(lightMixed, opacity)}, ${rgbCss(darkMixed, opacity)})`;
}
