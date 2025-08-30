import { ProjectUser, Session } from "@/types";
import { z } from "zod";

export const ANALYZE_USER_SYSTEM = `# Identity

You are an expert AI user journey analyst specializing in understanding longitudinal user behavior and product engagement patterns across multiple sessions.

# Task

You will analyze all sessions from a specific user to create a comprehensive understanding of their complete journey with the product. Your analysis should synthesize patterns across sessions to understand the user's evolving relationship with the product.

Your analysis should be structured in three distinct layers:

1. **Story (Objective)**: Document the user's complete journey across all their sessions - what they did, when, and how their usage evolved
2. **Health (Assessment)**: Evaluate the user's overall success, satisfaction, and likelihood to continue using the product
3. **Score (Metric)**: Assign a standardized 0-100 score based on a consistent rubric

# Analysis Guidelines

## For the Story
Create a chronological narrative of the user's complete journey:
- Document their first interactions and onboarding experience
- Track how their usage patterns evolved over time
- Note which features they adopted, abandoned, or consistently use
- Identify patterns in session frequency, duration, and depth of engagement
- Record the progression from new user to their current state
- Focus on WHAT happened across sessions, not interpretations

## For the Health Assessment
Evaluate the user's relationship with the product across multiple dimensions:
- **Success Patterns**: How consistently does the user achieve their goals across sessions?
- **Engagement Trajectory**: Is their usage increasing, stable, or declining?
- **Satisfaction Indicators**: Do their behaviors suggest delight, frustration, or indifference?
- **Feature Adoption**: Are they exploring new features or stuck in limited usage patterns?
- **Retention Likelihood**: Would they be disappointed if they could no longer use the product?
- **Churn Risk**: Are there warning signs of potential abandonment?

## For the Score (0-100 Rubric)
- **90-100**: Power user - consistently successful, highly engaged, explores features, increasing usage
- **70-89**: Regular user - mostly successful, good engagement, stable usage patterns
- **50-69**: Occasional user - mixed success, some friction, inconsistent engagement
- **30-49**: Struggling user - frequent issues, declining usage, at risk of churning
- **0-29**: Frustrated user - mostly unsuccessful, minimal engagement, likely to abandon

# Important Considerations

- Look for trends across sessions rather than focusing on individual session details
- Consider the time gaps between sessions as indicators of engagement
- Note any critical moments that changed the user's relationship with the product
- Identify if the user has found their "aha moment" or core value proposition
- Track whether issues from earlier sessions were resolved in later ones`;

export const ANALYZE_USER_PROMPT = ({
  projectUser,
  sessions,
}: {
  projectUser: ProjectUser;
  sessions: Session[];
}) => `Analyze this user's complete journey across all their sessions with the product.

# User Information
- User ID: ${projectUser.id}
- User Name: ${projectUser.name || "Unknown"}
- First Seen: ${projectUser.created_at}
- Total Sessions: ${sessions.length}
${projectUser.properties ? `- User Properties: ${JSON.stringify(projectUser.properties, null, 2)}` : ""}

# Session History
The user has had ${sessions.length} session(s) with the product. Here are their session stories in chronological order:

${sessions
  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  .map((session, index) => `
## Session ${index + 1} (${new Date(session.created_at).toLocaleDateString()})
- Session ID: ${session.id}
- Duration: ${session.active_duration ? `${Math.round(session.active_duration / 60)} minutes` : "Unknown"}
${session.story ? `\n### Session Story\n${session.story}` : ""}
${session.health ? `\n### Session Health\n${session.health}` : ""}
${session.score ? `\n### Session Score: ${session.score}/100` : ""}
`).join("\n")}

Based on this complete session history, provide your analysis of this user's journey, health, and score.`;

export const ANALYZE_USER_SCHEMA = z.object({
  story: z.string().describe("A natural, flowing narrative of the user's journey across all their sessions, written as a qualitative story in markdown. Tell their story like you're describing someone's evolving relationship with a product to a colleague - how they started, what they explored, how their usage changed over time. Write in a conversational, storytelling style that captures their progression. For example: 'This user first discovered the platform on March 15th, tentatively exploring the dashboard and settings. Over their next few visits, they grew more confident, diving into the analytics features and customizing their workspace. By their fifth session, they had become a regular, immediately navigating to their favorite tools...' Focus on painting a vivid picture of their journey - from newcomer to wherever they are now. Include natural observations about patterns, habits, and evolution. This should read like a story about a person's developing relationship with a product, not a clinical report. Use **bold** for emphasis and weave timing details naturally into the narrative."),
  health: z.string().describe("A brief, conversational assessment of this user's relationship with the product in markdown. In 2-3 sentences, capture their overall experience: Are they getting value? Are they likely to stick around or about to churn? Write naturally, like you're quickly characterizing them to a colleague: 'They're hooked - using it daily and discovering new features each time' or 'They're struggling to find value and probably won't be back.' Use **bold** for emphasis where needed."),
  score: z.number().describe("A numerical health score from 0-100 based on this strict rubric: 90-100 = Power user who is consistently successful, highly engaged, and shows increasing usage; 70-89 = Regular user who is mostly successful with good engagement and stable patterns; 50-69 = Occasional user with mixed success, some friction, and inconsistent engagement; 30-49 = Struggling user with frequent issues, declining usage, and churn risk; 0-29 = Frustrated user who is mostly unsuccessful with minimal engagement, likely to abandon. Apply this rubric consistently for reliable cross-user comparisons."),
});
