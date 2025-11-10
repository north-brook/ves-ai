import { Issue, Session, SessionDetectedIssue } from "@/types";
import z from "zod";

export const RECONCILE_ISSUE_SYSTEM = `# Identity

You are an expert AI product analyst specializing in issue tracking, root cause analysis, and bug deduplication.

# Task

Your task is to reconcile a specific issue detected from a session replay with similar issues that already exist in the project. The goal is to maintain a clean, actionable issue tracker without duplicates while ensuring all problems are properly documented.

# Key Principles

1. **Root Cause Focus**: Aggressively merge issues with the same underlying cause, even if symptoms or user experiences vary significantly. Prefer consolidation to reveal patterns.
2. **Actionability**: Maintain issues that developers can act upon with clear reproduction steps
3. **Severity Preservation**: When merging, preserve the highest severity/priority levels
4. **Comprehensive Documentation**: Combine all relevant details when merging issues

# Process

You will be provided with:
- The full session story for context
- A specific detected issue (story, type, severity, priority, timing)
- A list of potentially related existing issues

Follow these steps:
1. **Analyze** the detected issue's root cause and impact
2. **Compare** with existing issues, looking beyond surface symptoms
3. **Decide** whether to merge with existing or create new
4. **Return** a response object with your decision

# Response Format

You must return ONE of the following response structures:

## Option 1: Merge with Existing Issue
\`\`\`json
{
  "decision": "merge",
  "existingIssueName": "exact name from the list",
  "issueUpdate": {
    "name": "issue name",
    "story": "enhanced story with new reproduction details",
    "type": "bug|usability|improvement|feature",
    "severity": "critical|high|medium|low|suggestion",
    "priority": "immediate|high|medium|low|backlog"
  }
}
\`\`\`

## Option 2: Create New Issue
\`\`\`json
{
  "decision": "create",
  "newIssue": {
    "name": "new issue name",
    "story": "complete story with reproduction narrative",
    "type": "bug|usability|improvement|feature",
    "severity": "critical|high|medium|low|suggestion",
    "priority": "immediate|high|medium|low|backlog"
  }
}
\`\`\`

Choose "merge" when issues share the same root cause.
Choose "create" only when the problem is genuinely distinct.`;

export const RECONCILE_ISSUE_PROMPT = ({
  session,
  detectedIssue,
  relatedIssues,
}: {
  session: Pick<Session, "story" | "active_duration" | "score">;
  detectedIssue: SessionDetectedIssue;
  relatedIssues: Issue[];
}) => `You are reconciling a detected issue from a user session with the existing issue tracker.

# Session Context
${
  session.story
    ? `## Session Story
${session.story}

`
    : ""
}
This ${session.active_duration ? `${Math.round(session.active_duration / 60)}-minute` : ""} session${session.score ? ` had a health score of ${session.score}/100` : ""}${session.score && session.score < 50 ? ", indicating significant user friction" : ""}.

# Detected Issue to Reconcile
**Name:** ${detectedIssue.name}
**Type:** ${detectedIssue.type}
**Severity:** ${detectedIssue.severity}
**Priority:** ${detectedIssue.priority}
**Confidence:** ${detectedIssue.confidence || "medium"}
**Story:** ${detectedIssue.story}

${(() => {
  if (detectedIssue.severity === "critical")
    return "⚠️ This is a CRITICAL issue that likely blocked the user from completing their task.";
  if (detectedIssue.severity === "high")
    return "⚠️ This is a HIGH severity issue that significantly impacted the user experience.";
  if (detectedIssue.type === "bug")
    return "🐛 This appears to be a bug that needs fixing.";
  if (detectedIssue.type === "usability")
    return "🤔 This is a usability issue causing user friction.";
  return "";
})()}

# Existing Issues in the System
${
  relatedIssues.length > 0
    ? `Here are the most similar existing issues based on semantic similarity:

${relatedIssues
  .map(
    (issue, i) => `## ${i + 1}. ${issue.name}
**Type:** ${issue.type}
**Severity:** ${issue.severity}
**Priority:** ${issue.priority}
**Status:** ${issue.status || "open"}
**Story:** ${issue.story}
**Created:** ${new Date(issue.created_at).toLocaleDateString()}
`,
  )
  .join("\n")}`
    : "No similar issues found in the system."
}

# Decision Guidance

Consider these factors when deciding whether to merge or create new:

## When to MERGE (use \`mergeIssue\`) - DEFAULT TO MERGING

**Strongly prefer merging** when issues share the same root cause, even if symptoms vary. The goal is to consolidate related problems to reveal patterns and prioritize fixes effectively.

1. **Same Root Cause**: If the underlying technical failure point is the same, merge regardless of how symptoms present
   - Same API endpoint failing, same validation logic broken, same component unresponsive
   - Variations in user experience (slow vs timeout, unresponsive vs error) typically indicate the same core issue

2. **Same Component/Feature Area**: Issues affecting the same flow or feature should typically be merged
   - Different manifestations within the same form, page, or workflow
   - Various error states from the same system component

3. **Progressive or Related Severity**: When one issue appears to be an escalation or variation of another
   - Different degrees of the same problem (lag → freeze, error → crash)
   - Always merge and preserve the highest severity level

## When to CREATE NEW (use \`createIssue\`) - ONLY WHEN TRULY DISTINCT

Create a new issue **only** when the root cause is clearly different. If there's any reasonable possibility of a shared cause, prefer merging.

1. **Completely Different Root Cause**: The technical failure points are unrelated
   - Different system components, APIs, or code paths involved
   - One is a data validation issue, the other is a network infrastructure problem
   - Clearly distinct technical contexts that would require separate fixes

2. **Different User Flows**: Affects entirely separate product areas with no technical overlap
   - Issues in unrelated features that happen to share similar symptoms
   - Platform-specific problems with different underlying implementations

3. **Incompatible Fix Requirements**: Addressing one would not impact the other
   - Requires different code changes, different teams, or different technical approaches
   - Has fundamentally different reproduction conditions or triggers

# Your Task

1. Analyze if the detected issue has the same root cause as any existing issue
2. If merging, use \`mergeIssue\`
3. If creating new, use \`createIssue\` with complete details
4. Call \`done\` with success: true after your action

**Default to merging.** Focus on root causes, not symptoms. Multiple reports of the same underlying problem should always be merged. When in doubt, merge rather than create separate issues.`;

export const ISSUE_SCHEMA = z.object({
  story: z
    .string()
    .describe(
      "A natural, flowing narrative of how this issue manifests, written as a story in markdown body text (NOT using headers or templated sections). Tell the story of the problem like you're recounting what goes wrong to a colleague - what users are trying to do, how the issue appears, what happens as a result. Write in a conversational, storytelling style that captures the frustration or confusion. For example: 'Users click the submit button expecting their form to save, but **nothing happens**. They click again, then again more forcefully. After waiting, they scroll up to check if there was an **error message** they missed...' Focus on painting a vivid picture of how the issue impacts user journeys. This should read like a story about encountering a problem, not a bug report. Use **bold** to emphasize key terms, issues, and impacts. Include the emotional impact on users.",
    ),
  type: z
    .enum(["bug", "usability", "improvement", "feature"])
    .describe(
      "bug: Something is broken or not functioning as intended (errors, crashes, incorrect behavior); usability: Friction, confusion, slowness, or accessibility/performance problems; improvement: Improvement idea that isn't a defect but would enhance experience; feature: Missing functionality users clearly expect or attempt to use",
    ),
  severity: z
    .enum(["critical", "high", "medium", "low", "suggestion"])
    .describe(
      "critical: Blocks core flows, crashes, or data loss; high: Major impairment with no easy workaround; medium: Noticeable friction but task can still be completed; low: Minor annoyance or cosmetic issue; suggestion: Not a bug but a recommended improvement",
    ),
  priority: z
    .enum(["immediate", "high", "medium", "low", "backlog"])
    .describe(
      "immediate: Must fix right away (release blocker, outage, critical business impact - only use with high confidence); high: Fix very soon due to high user/business impact (requires medium-high confidence); medium: Fix in normal sprint cycle; low: Nice-to-fix with low impact; backlog: Non-urgent, can be deferred for later. Note: Factor confidence into priority - low confidence issues should not have immediate/high priority",
    ),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe(
      "low: Issue might exist but evidence is unclear, could be user error or expected behavior; medium: Likely an issue based on observed behavior but some uncertainty remains; high: Definitely an issue with clear evidence and reproducible impact",
    ),
  name: z
    .string()
    .describe(
      "Short sentence case name that describes the problem directly without component or feature prefixes. Use as few words as possible (3-8 words). Examples: 'Button unresponsive after submission', 'Search filters reset unexpectedly', 'Password validation not showing errors'.",
    ),
});

export const RECONCILE_ISSUE_SCHEMA = z.object({
  decision: z
    .enum(["merge", "create"])
    .describe(
      "Whether to merge with an existing issue or create a new one. Choose 'merge' when issues share the same root cause. Choose 'create' only when the problem is genuinely distinct.",
    ),
  existingIssueName: z
    .nullable(z.string())
    .describe(
      "Required when decision is 'merge'. The exact name of the existing issue from the relatedIssues list that represents the same problem. Must match exactly as it appears in the list. Set to null when decision is 'create'.",
    ),
  newIssue: z
    .nullable(ISSUE_SCHEMA)
    .describe(
      "Required when decision is 'create'. The complete definition for the new issue. Ensure the name clearly identifies the problem, the story includes the reproduction narrative from this session, and severity/priority accurately reflect the impact. Set to null when decision is 'merge'.",
    ),
});
