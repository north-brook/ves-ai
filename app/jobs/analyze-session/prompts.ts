import { Session, SessionDetectedIssue, Issue } from "@/types";
import { Type } from "@google/genai";
import z from "zod";

export const ANALYZE_SESSION_SYSTEM = `# Identity

You are an expert AI session replay analyst specializing in understanding user behavior and product effectiveness.

# Task

You will be provided a reconstructed user session replay along with helpful event context from a web application. Your task is to analyze, understand, and recount the user's story with precision and insight.

Your analysis should be structured in three distinct layers:

1. **Story (Objective)**: Document exactly what happened - the complete sequence of user actions and interactions
2. **Health (Assessment)**: Evaluate how successful the user was and how well the product supported them
3. **Score (Metric)**: Assign a standardized 0-100 score based on a consistent rubric

# Analysis Guidelines

## For the Story
Focus on creating a chronological narrative of the user's journey:
- Document the exact path taken through the product
- Note specific features and pages engaged with
- Record the sequence and timing of actions
- Describe observable behaviors without interpretation
- Include both successful actions and obstacles encountered

## For the Health Assessment
Evaluate three key dimensions:
- **User Success**: Did the user accomplish their apparent goals?
- **Feature Effectiveness**: Did the features work as intended and deliver on their promise?
- **Experience Quality**: Was the journey smooth, efficient, and satisfying?

## For the Score (0-100 Rubric)
- **90-100**: Flawless session - user achieved all goals effortlessly, features worked perfectly
- **70-89**: Successful session - user achieved main goals with minor friction
- **50-69**: Mixed session - partial success with noticeable challenges
- **30-49**: Struggling session - significant obstacles prevented goal achievement
- **0-29**: Failed session - user unable to accomplish goals, major issues present

# Important Considerations

Begin by carefully observing user behaviors without immediately assuming problems. Many actions have multiple plausible explanations:
- A user who adds items to cart but doesn't check out might be browsing, comparing options, or saving for later
- Hesitation might indicate reading, thinking, or decision-making rather than confusion
- Repeated actions could be intentional verification rather than errors

Think deeply about plausible explanations for user behavior and avoid jumping to conclusions.

# Technical Notes

For valid sessions:
- The session replay will play through periods of user activity, skipping periods of user inactivity
- The replay will not show external web pages (eg. Google authentication)
- The user may toggle between different tabs in the same replay
- The user's session will be rendered on a black background; if the user resizes their window, the rendered replay may change size in the frame
- Occasionally session replays will resize weirdly; this is not a bug with the application, but rather a limitation of capturing session replays
- The session replay construction is imperfect; some animations or interactions may be missing, some inputs may be masked, and there may be some general weirdness

# Process

First, verify that the video contains a valid session replay.

If the video is invalid (corrupted, doesn't load, doesn't contain a replay, or the replay doesn't actually play):
- Return: {valid_video: false, analysis: null}

If the session replay is valid and playable:
- Return: {valid_video: true, analysis: {observations, story, detected_features, detected_issues, health, score, name}}

# Timestamp Extraction

When identifying pages and issues, pay close attention to WHEN they occur in the video:
- Note the exact time in seconds from video start (0.0 = beginning of video)
- Use decimal precision when needed (e.g., 15.5 for 15 and a half seconds)  
- Record when pages are visited and issues manifest to help developers reproduce them
- Format: [[start_seconds, end_seconds], ...] for multiple occurrences
- Each [start, end] pair represents one continuous time range
- Multiple pairs indicate revisits (for pages) or recurrences (for issues)
- Example: [[10.5, 45.2], [120.0, 135.5]] means 10.5-45.2 seconds and 2:00-2:15.5`;

export const ANALYZE_SESSION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    valid_video: {
      type: Type.BOOLEAN,
      description:
        "Whether the video contains a valid, playable session replay. Set to false if the video is corrupted, doesn't load, shows an error, or doesn't contain an actual replay.",
    },
    analysis: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        story: {
          type: Type.STRING,
          description:
            "A natural, flowing narrative of the user's journey through the platform, written as a qualitative story in markdown. Tell their story like you're recounting someone's experience to a colleague - what they did, where they went, and how they moved through the product. Write in a conversational, storytelling style that captures the flow and rhythm of their session. For example: 'The user began their journey on the dashboard, where they spent a few moments exploring the navigation. They then clicked into the settings page, scrolled through the options, and toggled the dark mode feature. After that, they navigated to their profile...' Focus on painting a vivid picture of their path through the product, using natural language rather than technical descriptions. This should read like a story about a person's experience, not a clinical observation. Use **bold** for emphasis and include timing details naturally within the narrative flow.",
        },
        features: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description:
              "A product feature the user engaged with during their session. Use title case format (e.g., 'Product Catalog', 'Shopping Cart', 'User Dashboard'). Focus on identifying the specific product capabilities and functionalities the user interacted with. Examples: 'Product Creator', 'Lesson Planner', 'Checkout Flow', 'Search Filters', 'User Profile', 'Analytics Dashboard', 'Email Composer', 'Payment Processing', 'Inventory Management', 'Content Editor', 'Navigation Menu', 'Settings Panel'. Choose features that represent the actual product modules and tools the user utilized.",
          },
        },
        name: {
          type: Type.STRING,
          description:
            "A sentence case (first letter capitalized, no punctuation) concise summary of the user story. Focus on capturing the essence of what the user attempted and what happened. Examples: 'User successfully completes purchase after address validation issue', 'New visitor explores pricing but leaves without signing up', 'Customer encounters repeated errors while configuring dashboard filters', 'User navigates complex checkout flow and abandons at payment'. Keep it under 10 words and make it a complete narrative summary without any punctuation marks.",
        },
        detected_issues: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description:
                  "Short sentence case name that (in as few words as possible) describes the issue (e.g., 'Checkout button unresponsive', 'Search filters reset unexpectedly').",
              },
              type: {
                type: Type.STRING,
                enum: ["bug", "usability", "suggestion", "feature"],
                description:
                  "bug: Something is broken or not functioning as intended (errors, crashes, incorrect behavior); usability: Friction, confusion, slowness, or accessibility/performance problems that impede user progress; suggestion: Improvement idea that isn't a defect but would enhance the experience; feature: Missing functionality users clearly expect or attempt to use",
              },
              severity: {
                type: Type.STRING,
                enum: ["critical", "high", "medium", "low", "suggestion"],
                description:
                  "critical: Blocks core flows, causes crashes or data loss, makes product unusable; high: Major impairment with no easy workaround, significantly degrades experience; medium: Noticeable friction or confusion but task can still be completed with effort; low: Minor annoyance or cosmetic issue with minimal impact; suggestion: Not a bug but a recommended improvement",
              },
              priority: {
                type: Type.STRING,
                enum: ["immediate", "high", "medium", "low", "backlog"],
                description:
                  "immediate: Must fix right away - release blocker, outage, or critical business impact (only use with high confidence); high: Fix very soon due to high user or business impact (requires medium-high confidence); medium: Fix in normal sprint cycle as part of regular improvements; low: Nice-to-fix with low user impact; backlog: Non-urgent, can be deferred or tracked for future consideration. Note: Factor confidence into priority - don't assign immediate/high priority to low confidence issues",
              },
              confidence: {
                type: Type.STRING,
                enum: ["low", "medium", "high"],
                description:
                  "low: Issue might exist but evidence is unclear, could be user error or expected behavior; medium: Likely an issue based on observed behavior but some uncertainty remains; high: Definitely an issue with clear evidence and reproducible impact. Use this to modulate priority - low confidence issues should not have immediate/high priority",
              },
              times: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.NUMBER,
                  },
                },
                description:
                  "Time ranges when this issue manifested, in seconds from video start (0.0 = beginning). Format: [[start, end], ...] where each pair represents one occurrence of the issue. Use decimal precision (e.g., 10.5 for 10½ seconds). Multiple pairs if issue recurs. Example: [[30.0, 35.5], [180.0, 182.0]] means the issue occurred from 0:30-0:35.5 and again from 3:00-3:02 in the video. Be precise to help developers reproduce the issue.",
              },
              story: {
                type: Type.STRING,
                description:
                  "A natural, flowing narrative of how this issue manifested in the user's experience, written as a story in markdown. Tell the story of the problem like you're recounting what went wrong to a colleague - what the user was trying to do, how the issue appeared, what happened as a result. Write in a conversational, storytelling style that captures the frustration or confusion. For example: 'The user clicked the submit button expecting their form to save, but nothing happened. They clicked again, then again more forcefully. After a few seconds of waiting, they scrolled up to check if there was an error message they missed...' Focus on painting a vivid picture of how the issue impacted their journey. This should read like a story about encountering a problem, not a bug report. Use **bold** for emphasis and include the emotional impact on the user.",
              },
            },
            required: [
              "name",
              "type",
              "severity",
              "priority",
              "confidence",
              "times",
              "story",
            ],
            propertyOrdering: [
              "name",
              "type",
              "severity",
              "priority",
              "confidence",
              "times",
              "story",
            ],
          },
          description:
            "A list of specific issues (bugs, usability issues, suggestions, feature requests) detected in the session with timestamps. Each issue should be distinct, clearly scoped, and broad enough to encompass related instances from other sessions. Focus on problems that would be actionable for the product team to address.",
        },
        health: {
          type: Type.STRING,
          description:
            "A brief, conversational assessment of how this session went in markdown. In 2-3 sentences, capture the essence: Did they accomplish what they came to do? Was it smooth or frustrating? Would they walk away satisfied? Write naturally, like you're quickly summarizing to a colleague: 'They got what they needed but it took way too long' or 'Everything clicked perfectly - they were in and out with exactly what they wanted.' Use **bold** for emphasis where needed.",
        },
        score: {
          type: Type.NUMBER,
          description:
            "A numerical health score from 0-100 based on this strict rubric: 90-100 = Flawless session where user achieved all goals effortlessly and features worked perfectly; 70-89 = Successful session where user achieved main goals with only minor friction; 50-69 = Mixed session with partial success but noticeable challenges; 30-49 = Struggling session where significant obstacles prevented goal achievement; 0-29 = Failed session where user was unable to accomplish goals due to major issues. Be consistent in applying this rubric so scores can be reliably compared across sessions.",
        },
      },
      required: [
        "story",
        "features",
        "name",
        "detected_issues",
        "health",
        "score",
      ],
      propertyOrdering: [
        "story",
        "features",
        "name",
        "detected_issues",
        "health",
        "score",
      ],
      description:
        "The full analysis object. Only provided if valid_video is true, otherwise must be null.",
    },
  },
  required: ["valid_video", "analysis"],
  propertyOrdering: ["valid_video", "analysis"],
};

export const RECONCILE_ISSUE_SYSTEM = `# Identity

You are an expert AI product analyst specializing in issue tracking, root cause analysis, and bug deduplication.

# Task

Your task is to reconcile a specific issue detected from a session replay with similar issues that already exist in the project. The goal is to maintain a clean, actionable issue tracker without duplicates while ensuring all problems are properly documented.

# Key Principles

1. **Root Cause Focus**: Issues with the same underlying cause should be merged, even if symptoms vary
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
  session: Session;
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

## When to MERGE (use \`mergeIssue\`)
1. **Same Root Cause**: Different symptoms but same underlying problem
   - "Login button unresponsive" and "Cannot submit login form" → same issue
   - "Slow search results" and "Search timeout errors" → likely same performance issue

2. **Same Component/Area**: Issues affecting the same feature or flow
   - Multiple validation errors in the same form
   - Different error messages from the same API endpoint

3. **Progressive Severity**: The detected issue is a worse manifestation
   - Existing: "Occasional lag in checkout" → Detected: "Checkout completely frozen"
   - Merge and update severity to the higher level

## When to CREATE NEW (use \`createIssue\`)
1. **Different Root Cause**: Similar symptoms but different underlying problems
   - "Cannot save profile" due to validation vs network error
   - "Page not loading" due to 404 vs JavaScript error

2. **Different Impact Area**: Affects different user flows or features
   - Search issues vs Checkout issues (even if both are "slow")
   - Mobile-specific vs Desktop-specific problems

3. **Different Reproduction Steps**: Requires different conditions to trigger
   - Issue only occurs with specific data
   - Issue only occurs in specific browser/environment

# Your Task

1. Analyze if the detected issue has the same root cause as any existing issue
2. If merging, use \`mergeIssue\` with an enhanced story that includes:
   - The new reproduction case from this session
   - Updated severity/priority if this instance is worse
   - Additional context about impact
3. If creating new, use \`createIssue\` with complete details
4. Call \`done\` with success: true after your action

Focus on root causes, not just symptoms. Multiple reports of the same underlying problem should be merged.`;

export const ISSUE_SCHEMA = z.object({
  story: z
    .string()
    .describe(
      "A natural, flowing narrative of how this issue manifests, written as a story in markdown. Tell the story of the problem like you're recounting what goes wrong to a colleague - what users are trying to do, how the issue appears, what happens as a result. Write in a conversational, storytelling style that captures the frustration or confusion. For example: 'Users click the submit button expecting their form to save, but nothing happens. They click again, then again more forcefully. After waiting, they scroll up to check if there was an error message they missed...' Focus on painting a vivid picture of how the issue impacts user journeys. This should read like a story about encountering a problem, not a bug report. Use **bold** for emphasis and include the emotional impact on users.",
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
      "Short sentence case name that (in as few words as possible) describes the issue (e.g., 'Checkout button unresponsive', 'Search filters reset unexpectedly').",
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
  issueUpdate: z
    .nullable(ISSUE_SCHEMA)
    .describe(
      "Required when decision is 'merge'. The enhanced issue definition that combines the existing issue's information with new details from this detection. Include the new reproduction narrative, preserve the highest severity/priority levels, and add any additional context. Set to null when decision is 'create'.",
    ),
  newIssue: z
    .nullable(ISSUE_SCHEMA)
    .describe(
      "Required when decision is 'create'. The complete definition for the new issue. Ensure the name clearly identifies the problem, the story includes the reproduction narrative from this session, and severity/priority accurately reflect the impact. Set to null when decision is 'merge'.",
    ),
});
