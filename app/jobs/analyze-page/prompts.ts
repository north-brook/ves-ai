import { Page, Session } from "@/types";
import { z } from "zod";

export const ANALYZE_PAGE_SYSTEM = `# Identity

You are an expert AI page effectiveness analyst specializing in understanding how specific product pages perform across user sessions and deliver on their intended value proposition.

# Task

You will analyze all sessions where a specific page was used to create a comprehensive understanding of that page's effectiveness, usage patterns, and value delivery. Your analysis should synthesize patterns across all relevant sessions to understand the page's performance.

Your analysis should be structured in three distinct layers:

1. **Story (Objective)**: Document how users interact with the page, usage patterns, and common workflows
2. **Health (Assessment)**: Evaluate the page's success at delivering its promise and helping users achieve their goals
3. **Score (Metric)**: Assign a standardized 0-100 score based on a consistent rubric

# Analysis Guidelines

## For the Story
Create a comprehensive narrative of how this page is used:
- Document the different ways users engage with the page
- Identify common usage patterns and workflows
- Note the contexts in which the page is typically accessed
- Track how users navigate to and from this page
- Record variations in how different users approach the page
- Map successful vs. unsuccessful interaction patterns
- Focus on WHAT happens when users engage with this page

## For the Health Assessment
Evaluate the page's effectiveness across multiple dimensions:
- **Goal Achievement**: Does the page reliably help users accomplish what they're trying to do?
- **Ease of Use**: Do users navigate the page smoothly or struggle with it?
- **Value Delivery**: Is the page delivering on its intended promise?
- **User Satisfaction**: Do user behaviors suggest satisfaction or frustration?
- **Reliability**: Does the page work consistently across different sessions?
- **Adoption Success**: Are users who try the page continuing to use it?

## For the Score (0-100 Rubric)
- **90-100**: Page excellently fulfills its purpose, users consistently successful, smooth interactions
- **70-89**: Page generally effective, most users achieve their goals with minor friction
- **50-69**: Page partially effective, mixed user success, noticeable usability issues
- **30-49**: Page underperforming, users often struggle, significant problems present
- **0-29**: Page failing, users cannot achieve intended goals, major issues or abandonment

# Important Considerations

- Look for patterns that distinguish successful from unsuccessful page usage
- Consider whether issues are with the page itself or user understanding
- Identify if certain user segments use the page more effectively than others
- Note if the page requires too many steps or has confusing workflows
- Track whether users discover and adopt the page naturally or need guidance`;

export const ANALYZE_PAGE_PROMPT = ({
  page,
  sessions,
}: {
  page: Page;
  sessions: Session[];
}) => `Analyze this page's effectiveness and usage patterns across all sessions where it was used.

# Page Information
- Page ID: ${page.id}
- Page Path: ${page.path}
- Total Sessions Using This Page: ${sessions.length}

# Usage Statistics
${(() => {
  const successfulSessions = sessions.filter((s) => s.score && s.score >= 70);
  const struggingSessions = sessions.filter((s) => s.score && s.score < 50);
  const averageScore =
    sessions
      .filter((s) => s.score)
      .reduce((sum, s) => sum + (s.score || 0), 0) /
      sessions.filter((s) => s.score).length || 0;

  return `- Sessions with High Success (70-100 score): ${successfulSessions.length}
- Sessions with Low Success (0-49 score): ${struggingSessions.length}
- Average Session Score: ${averageScore.toFixed(1)}/100`;
})()}

# All Sessions Using This Page
Here are all the sessions where users engaged with this page, with complete stories:

${sessions
  .sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  .map(
    (session, index) => `
## Session ${index + 1} (${new Date(session.created_at).toLocaleDateString()})
- Session ID: ${session.id}
- Duration: ${session.active_duration ? `${Math.round(session.active_duration / 60)} minutes` : "Unknown"}
- Score: ${session.score !== null && session.score !== undefined ? `${session.score}/100` : "Not scored"}
${session.name ? `- Summary: ${session.name}` : ""}

${session.story ? `### Session Story\n${session.story}\n` : ""}
${session.health ? `### Session Health\n${session.health}\n` : ""}
`,
  )
  .join("\n---\n")}

Based on all these sessions, provide your analysis of this page's story, health, and score.`;

export const ANALYZE_PAGE_SCHEMA = z.object({
  story: z
    .string()
    .describe(
      "A natural, flowing narrative of how people use this page, written as a qualitative story in markdown. Tell the page's story like you're explaining to a colleague how users actually interact with it - the different ways they approach it, what they're trying to do, how they navigate through it. Write in a conversational style that captures real usage patterns. For example: 'Most users discover the search page when they're overwhelmed by the product catalog. They typically type a few keywords, scan the results, then either refine their search or click through to a product. Power users have learned to use the advanced filters, while newcomers often miss them entirely...' Focus on painting a vivid picture of how this page fits into users' workflows. This should read like an ethnographic observation of page usage, not a technical report. Use **bold** for emphasis and weave insights naturally into the narrative.",
    ),
  health: z
    .string()
    .describe(
      "A brief, conversational assessment of this page's effectiveness in markdown. In 2-3 sentences, capture the reality: Does it actually work for users? Are they getting what they need from it or fighting with it? Write naturally, like you're quickly evaluating to a colleague: 'The search works beautifully - users find what they need in seconds' or 'The filter UI is a disaster - everyone gets confused and most give up.' Use **bold** for emphasis where needed.",
    ),
  score: z
    .number()
    .describe(
      "A numerical health score from 0-100 based on this strict rubric: 90-100 = Page excellently fulfills purpose with users consistently successful and smooth interactions; 70-89 = Page generally effective with most users achieving goals despite minor friction; 50-69 = Page partially effective with mixed success and noticeable usability issues; 30-49 = Page underperforming with users often struggling and significant problems; 0-29 = Page failing with users unable to achieve goals and major issues present. Apply consistently for cross-page comparisons.",
    ),
});
