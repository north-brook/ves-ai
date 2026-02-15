import { ProjectGroup, ProjectUser } from "@/types";
import { z } from "zod";

export const ANALYZE_GROUP_SYSTEM = `# Identity

You are an expert AI organizational behavior analyst specializing in understanding collective usage patterns, team adoption dynamics, and organization-wide product engagement.

# Task

You will analyze all users within a specific group/organization to create a comprehensive understanding of their collective journey with the product. Your analysis should synthesize patterns across all users to understand the organization's relationship with the product.

Your analysis should be structured in three distinct layers:

1. **Story (Objective)**: Document the collective usage patterns, adoption timeline, and feature utilization across all users in the group
2. **Health (Assessment)**: Evaluate the group's overall success rates, user retention, adoption trends, and collective satisfaction
3. **Score (Metric)**: Assign a standardized 0-100 score based on a consistent rubric

# Analysis Guidelines

## For the Story
Create a comprehensive narrative of the group's collective journey:
- Document when different users joined and their onboarding patterns
- Track adoption spread across the organization
- Identify power users, regular users, and inactive users
- Note which features are widely adopted vs. underutilized
- Record patterns in user collaboration or isolated usage
- Map the organization's usage evolution over time
- Focus on WHAT is happening across the group, not interpretations

## For the Health Assessment
Evaluate the organization's relationship with the product:
- **Adoption Success**: How successfully has the product been adopted across the organization?
- **User Distribution**: What's the ratio of power users to struggling users?
- **Collective Success**: Are users generally achieving their goals with the product?
- **Retention Patterns**: Are users continuing to engage or dropping off?
- **Growth Trajectory**: Is usage expanding, stable, or contracting within the organization?
- **Organizational Value**: Is the product delivering value at the organizational level?

## For the Score (0-100 Rubric)
- **90-100**: Thriving organization - widespread adoption, expanding usage, high collective success
- **70-89**: Healthy adoption - good user retention, positive trends, most users successful
- **50-69**: Mixed adoption - some users thriving while others struggle, neutral trends
- **30-49**: Poor adoption - many users churning, limited success, negative trends
- **0-29**: Failing adoption - widespread issues, minimal engagement, abandonment risk

# Important Considerations

- Look for patterns that indicate organizational buy-in vs. individual adoption
- Consider whether successful users are helping struggling users
- Identify if there are department or role-based usage patterns
- Note if certain features are critical for the organization while others are ignored
- Track whether the organization is expanding or reducing their product usage

# Handling Incomplete Data

Some users may not yet have AI analysis available (status != "analyzed"). When this occurs:
- **Base your analysis primarily on users with complete analysis** (those with story, health, and score)
- Users without analysis still provide valuable context (join date, session timing, duration patterns)
- **Explicitly acknowledge data limitations** when a significant portion of users lack analysis
- **Qualify your confidence** based on the ratio of analyzed to unanalyzed users
- If many recent or active users are unanalyzed, note that the group's current state may be uncertain
- Use session timing and duration of unanalyzed users to form early intuition (frequent recent sessions suggest engagement)
- Be transparent about what you can and cannot confidently assess given the available data`;

export const ANALYZE_GROUP_PROMPT = ({
  projectGroup,
  projectUsers,
}: {
  projectGroup: ProjectGroup;
  projectUsers: ProjectUser[];
}) => {
  const analyzedUsers = projectUsers.filter(
    (u) => u.status === "analyzed" && u.story,
  );
  const unanalyzedUsers = projectUsers.filter(
    (u) => u.status !== "analyzed" || !u.story,
  );

  return `Analyze this group/organization's collective journey with the product across all their users.

# Group Information
- Group ID: ${projectGroup.id}
- Group Name: ${projectGroup.name || "Unknown"}
- First Activity: ${projectGroup.created_at}
- Total Users: ${projectUsers.length}
${projectGroup.properties ? `- Group Properties: ${JSON.stringify(projectGroup.properties, null, 2)}` : ""}

# Data Completeness
- **Analyzed Users**: ${analyzedUsers.length} (with full AI analysis available)
- **Unanalyzed Users**: ${unanalyzedUsers.length} (analysis pending or in progress)
${unanalyzedUsers.length > 0 ? `- **Note**: Base your assessment primarily on the ${analyzedUsers.length} analyzed user(s). Use session timing/duration of unanalyzed users for early intuition, but acknowledge uncertainty in your health assessment.` : ""}

# Individual User Stories
Here are the individual user analyses for all users in this group:

${projectUsers
  .sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  .map(
    (user, index) => `
## User ${index + 1}: ${user.name || "Unknown"} (Joined ${new Date(user.created_at).toLocaleDateString()})
- User ID: ${user.id}
- Analysis Status: ${user.status === "analyzed" && user.story ? "Complete" : "Pending"}
${user.session_at ? `- Last Session: ${new Date(user.session_at).toLocaleDateString()}` : ""}
${user.story ? `\n### User Story\n${user.story}` : "- No story available yet (analysis pending)"}
${user.health ? `\n### User Health\n${user.health}` : ""}
${user.score !== null && user.score !== undefined ? `\n### User Score: ${user.score}/100` : ""}
`,
  )
  .join("\n")}

Based on all these individual user journeys, provide your analysis of this group's collective story, health, and score.`;
};

export const ANALYZE_GROUP_SCHEMA = z.object({
  story: z
    .string()
    .describe(
      "A natural, flowing narrative of the group's collective journey with the product, written as a qualitative story in markdown. Tell their story like you're describing a team's adoption journey to a colleague - how they discovered the product, who the early adopters were, how usage spread (or didn't), and what the current state looks like. Write in a conversational, storytelling style that captures the organizational dynamics. For example: 'This organization's journey began when Sarah from the marketing team discovered the platform in early March. She became an immediate champion, using it daily and showing impressive results. Her enthusiasm caught the attention of her teammates, and within weeks, three more marketers had joined. Meanwhile, the engineering team remained skeptical, with only one developer occasionally logging in...' Focus on painting a vivid picture of how the product has (or hasn't) woven itself into the organization's fabric. Include natural observations about adoption patterns, team dynamics, and collective behaviors. This should read like a story about a group's relationship with a product, not a corporate report. Use **bold** for emphasis and weave insights naturally into the narrative.",
    ),
  health: z
    .string()
    .describe(
      "A brief, conversational assessment of this group's relationship with the product in markdown. In 2-3 sentences, capture the organizational reality: Is adoption spreading or stalling? Are they getting collective value or is it just a few champions? Write naturally, like you're quickly summarizing to a colleague: 'Adoption is viral - half the team is already power users and pulling others in' or 'It's basically just two people using it while everyone else ignores it.' Use **bold** for emphasis where needed.",
    ),
  score: z
    .number()
    .describe(
      "A numerical health score from 0-100 based on this strict rubric: 90-100 = Thriving organization with widespread adoption, expanding usage, and high collective success; 70-89 = Healthy adoption with good user retention, positive trends, and most users successful; 50-69 = Mixed adoption where some users thrive while others struggle, with neutral trends; 30-49 = Poor adoption with many users churning, limited success, and negative trends; 0-29 = Failing adoption with widespread issues, minimal engagement, and abandonment risk. Apply consistently for cross-group comparisons.",
    ),
});
