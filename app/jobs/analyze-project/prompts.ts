import { Project, Session, ProjectUser, ProjectGroup } from "@/types";
import { Tables } from "@/schema";
import { z } from "zod";

type Issue = Tables<"issues">;

export const ANALYZE_PROJECT_SYSTEM = `# Identity

You are an expert AI product analyst specializing in creating comprehensive weekly reports that synthesize product health, user engagement, and actionable insights across an entire project.

# Task

You will analyze recent activity across a project to create a weekly executive summary. Your analysis should synthesize data from new sessions, user behaviors, page performance, and emerging issues to provide a clear picture of product health and opportunities.

Your analysis should be structured in three distinct layers:

1. **Story (Objective)**: Document what happened in the project over the reporting period - new activity, trends, and patterns
2. **Health (Assessment)**: Evaluate the overall product health, user satisfaction, and business metrics
3. **Score (Metric)**: Assign a standardized 0-100 score based on a consistent rubric

# Analysis Guidelines

## For the Story
Create a comprehensive narrative of the project's recent activity:
- Summarize new user sessions and their outcomes
- Document emerging usage patterns and trends
- Highlight significant user journeys (both successful and problematic)
- Note changes in page adoption and usage
- Track new issues discovered and resolved
- Map user growth and retention patterns
- Focus on WHAT happened during this period

## For the Health Assessment
Evaluate the overall product health across key dimensions:
- **User Success Rate**: What percentage of users are achieving their goals?
- **Product Stability**: Are critical issues impacting core functionality?
- **Growth Metrics**: Is user engagement expanding or contracting?
- **Page Performance**: Which pages are driving value vs. causing friction?
- **Issue Resolution**: Are problems being identified and addressed?
- **Business Impact**: Is the product delivering on its value proposition?

## For the Score (0-100 Rubric)
- **90-100**: Excellent health - high user success, growing engagement, minimal issues
- **70-89**: Good health - solid performance with minor areas for improvement
- **50-69**: Moderate health - mixed results with several areas needing attention
- **30-49**: Poor health - significant issues impacting user experience
- **0-29**: Critical health - major problems requiring immediate intervention

# Report Structure

Your report should be concise yet comprehensive, suitable for executive review while containing enough detail for product teams to take action. Focus on insights that drive decisions rather than raw data dumps.`;

export const ANALYZE_PROJECT_PROMPT = ({
  project,
  recentSessions,
  recentUsers,
  recentGroups,
  weeklyNewIssues,
  openCriticalHighIssues,
  stats,
}: {
  project: Project;
  recentSessions: Session[];
  recentUsers: ProjectUser[];
  recentGroups: ProjectGroup[];
  weeklyNewIssues: Issue[]; // Issues created in the last week
  openCriticalHighIssues: Issue[]; // All critical/high priority issues still open
  stats: {
    weeklySessionCount: number;
    weeklyUserCount: number;
    weeklyGroupCount: number;
    weeklyAverageSessionScore: number;
    weeklyAverageUserScore: number;
    weeklyNewIssuesCount: number;
    openCriticalHighIssuesCount: number;
  };
}) => `Generate a weekly report for this project analyzing recent activity and overall health.

# Project Information
- Project ID: ${project.id}
- Project Name: ${project.name}
- Reporting Period: Last 7 days (${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} to ${new Date().toLocaleDateString()})

# Activity Summary
- New Sessions: ${recentSessions.length}
- Active Users: ${recentUsers.length}
- Active Organizations: ${recentGroups.length}

# Weekly Metrics (Last 7 Days)
- Sessions This Week: ${stats.weeklySessionCount}
- Active Users This Week: ${stats.weeklyUserCount}
- Active Organizations This Week: ${stats.weeklyGroupCount}
- Average Session Score (This Week): ${stats.weeklyAverageSessionScore.toFixed(1)}/100
- Average User Score (This Week): ${stats.weeklyAverageUserScore.toFixed(1)}/100
- New Issues This Week: ${stats.weeklyNewIssuesCount}
- Open Critical/High Priority Issues (All Time): ${stats.openCriticalHighIssuesCount}

# All Sessions from This Week
${
  recentSessions.length > 0
    ? recentSessions
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map(
          (session, index) => `
## Session ${index + 1} (${new Date(session.created_at).toLocaleDateString()})
- Session ID: ${session.id}
- User: ${session.project_user_id}
- Duration: ${session.active_duration ? `${Math.round(session.active_duration / 60)} minutes` : "Unknown"}
- Score: ${session.score !== null && session.score !== undefined ? `${session.score}/100` : "Not scored"}
${session.name ? `- Summary: ${session.name}` : ""}

${session.story ? `### Session Story\n${session.story}\n` : ""}
${session.health ? `### Session Health\n${session.health}\n` : ""}
`,
        )
        .join("\n---\n")
    : "No sessions this week"
}

# All Active Users from This Week
${
  recentUsers.length > 0
    ? recentUsers
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map(
          (user, index) => `
## User ${index + 1}: ${user.name || "Unknown"}
- User ID: ${user.id}
- First Seen: ${new Date(user.created_at).toLocaleDateString()}
- Score: ${user.score !== null && user.score !== undefined ? `${user.score}/100` : "Not scored"}
${user.properties ? `- Properties: ${JSON.stringify(user.properties, null, 2)}` : ""}

${user.story ? `### User Story\n${user.story}\n` : ""}
${user.health ? `### User Health\n${user.health}\n` : ""}
`,
        )
        .join("\n---\n")
    : "No active users this week"
}

# All Active Groups from This Week
${
  recentGroups.length > 0
    ? recentGroups
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map(
          (group, index) => `
## Group ${index + 1}: ${group.name || "Unknown"}
- Group ID: ${group.id}
- First Activity: ${new Date(group.created_at).toLocaleDateString()}
- Score: ${group.score !== null && group.score !== undefined ? `${group.score}/100` : "Not scored"}
${group.properties ? `- Properties: ${JSON.stringify(group.properties, null, 2)}` : ""}

${group.story ? `### Group Story\n${group.story}\n` : ""}
${group.health ? `### Group Health\n${group.health}\n` : ""}
`,
        )
        .join("\n---\n")
    : "No active groups this week"
}

# New Issues This Week
${
  weeklyNewIssues.length > 0
    ? weeklyNewIssues
        .map(
          (issue, index) => `
## Issue ${index + 1}: ${issue.name}
- Issue ID: ${issue.id}
- Type: ${issue.type}
- Severity: ${issue.severity}
- Priority: ${issue.priority}
- Status: ${issue.status || "Open"}
- Created: ${new Date(issue.created_at).toLocaleDateString()}
${issue.story ? `\n### Story\n${issue.story}` : ""}
""
`,
        )
        .join("\n---\n")
    : "No new issues this week"
}

# Open Critical & High Priority Issues (All Time)
${
  openCriticalHighIssues.length > 0
    ? openCriticalHighIssues
        .map(
          (issue) => `
## ${issue.severity === "critical" ? "🔴 CRITICAL" : issue.priority === "immediate" ? "🟠 IMMEDIATE" : "🟡 HIGH"}: ${issue.name}
- Issue ID: ${issue.id}
- Type: ${issue.type}
- Severity: ${issue.severity}
- Priority: ${issue.priority}
- Status: ${issue.status || "Open"}
- Created: ${new Date(issue.created_at).toLocaleDateString()}
- Age: ${Math.floor((Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
${issue.story ? `\n### Story\n${issue.story}` : ""}
""
`,
        )
        .join("\n---\n")
    : "No open critical or high priority issues"
}

Based on all this comprehensive data including complete stories for all sessions, users, groups, and pages from this week, plus all issues, provide your comprehensive weekly report with story, health assessment, overall score, and actionable recommendations.`;

export const ANALYZE_PROJECT_SCHEMA = z.object({
  story: z
    .string()
    .describe(
      "A comprehensive weekly report narrative using markdown formatting. Document what happened in the project over the past week. Structure with sections like: ## Activity Overview - Summarize new sessions and user activity, ## Emerging Patterns - Highlight trends and notable behaviors, ## Page Updates - Document changes in page usage and performance, ## Issue Discovery - Note new problems identified, ## User Journey Highlights - Share significant user stories (both positive and negative). Focus on WHAT happened without subjective assessments. Use **bold** for emphasis and include specific examples.",
    ),
  health: z
    .string()
    .describe(
      "A detailed health assessment paragraph using markdown that evaluates the overall product health for this reporting period. Address: 1) What percentage of users are successfully achieving their goals? 2) Are there critical issues impacting the product? 3) Is user engagement growing, stable, or declining? 4) Which pages are performing well vs. poorly? 5) What is the overall trajectory of the product? Consider user success rates, product stability, growth metrics, and business impact. Use **bold** for emphasis and provide specific metrics where relevant.",
    ),
  score: z
    .number()
    .describe(
      "A numerical health score from 0-100 based on this strict rubric: 90-100 = Excellent health with high user success, growing engagement, and minimal issues; 70-89 = Good health with solid performance and minor areas for improvement; 50-69 = Moderate health with mixed results and several areas needing attention; 30-49 = Poor health with significant issues impacting user experience; 0-29 = Critical health with major problems requiring immediate intervention. This score should reflect the overall product health for the reporting period.",
    ),
  recommendation: z
    .string()
    .describe(
      "A focused, action-driving recommendation paragraph using markdown formatting that synthesizes the entire analysis into clear next steps for the product team. This should identify the 2-3 most critical actions needed based on the data, explaining WHY these actions are important (citing specific metrics or patterns from the analysis) and WHAT specific steps should be taken. Structure as: Start with the most impactful recommendation, explain the evidence supporting it, then provide concrete implementation steps. Use **bold** to emphasize key actions and metrics. Example format: 'Based on the 45% of users experiencing checkout failures, **immediately prioritize fixing the payment validation bug** that's blocking successful transactions. This single issue accounts for a 25-point drop in average session scores. Next, **enhance the onboarding flow** where 30% of new users abandon within the first session - implement tooltips and progress indicators to guide users through initial setup. Finally, **investigate the dashboard performance issues** affecting power users who are showing declining engagement scores.' Keep it actionable, specific, and data-driven.",
    ),
});
