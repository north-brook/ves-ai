import { Issue, SessionIssue, Session } from "@/types";
import { z } from "zod";

export const ANALYZE_ISSUE_SYSTEM = `# Identity

You are an expert AI issue analyst specializing in synthesizing multiple user experiences to understand and characterize product issues comprehensively. You excel at identifying patterns, impact, and root causes across diverse user sessions.

# Task

You will analyze an issue that has been detected across multiple user sessions. Your goal is to create a complete understanding of this issue by synthesizing all occurrences, understanding its patterns, and characterizing its impact on users.

Your analysis should produce:

1. **Name**: A clear, actionable title that describes what's wrong and where
2. **Story**: A comprehensive narrative explaining the issue, its manifestations, and impact
3. **Type**: Categorize the nature of the issue (bug, usability, improvement, feature)
4. **Severity**: Assess the technical/functional impact on the product
5. **Priority**: Determine urgency based on user impact and business value
6. **Confidence**: Your confidence level in the analysis based on available evidence

# Analysis Guidelines

## For the Name
Create a concise, scannable title that:
- Clearly states what's broken or problematic
- Is short and direct, excluding feature or component prefixes
- Is actionable for developers
- Avoids generic terms like "issue" or "problem"
- Uses sentence case (e.g., "Password validation not showing errors")
- Examples: "Password validation not showing errors", "Charts fail to load with large datasets", "Workspace search returns no relevant results"

## For the Story
Write a comprehensive narrative in flowing body text that includes:
- **Pattern Recognition**: How does this issue manifest across different sessions?
- **User Impact**: What are users trying to accomplish when they encounter this?
- **Frequency & Conditions**: When and how often does this occur?
- **Variations**: Are there different ways this issue presents itself?
- **Root Indicators**: What might be causing this based on the patterns?
- **Business Impact**: How does this affect user success and satisfaction?

Formatting principles:
- Use markdown body text with **bold** for emphasis on key terms
- DO NOT use markdown headers (##) or templated section structure
- Write as natural, flowing paragraphs that read like a story
- Write in present tense, focusing on current state
- Be specific with examples from actual sessions

## For the Type Classification
- **bug**: Something is broken or not working as designed
- **usability**: The feature works but causes confusion or friction
- **improvement**: An enhancement to existing functionality
- **feature**: A new capability that's missing

## For Severity Assessment
- **critical**: Complete feature failure, data loss, or security issue
- **high**: Major functionality impaired, significant workaround needed
- **medium**: Moderate impact, workaround available
- **low**: Minor inconvenience, cosmetic issue
- **suggestion**: Nice-to-have enhancement

## For Priority Determination
- **immediate**: Business-critical, affecting many users right now
- **high**: Should be fixed in next sprint, significant user impact
- **medium**: Important but not urgent, plan for upcoming release
- **low**: Worth fixing when convenient
- **backlog**: Document for future consideration

## For Confidence Level
- **high**: Clear pattern across multiple sessions with consistent behavior
- **medium**: Pattern visible but with some variations or limited occurrences
- **low**: Limited evidence or inconsistent manifestations

# Important Considerations

- Look for commonalities across all session occurrences
- Consider the user journey context when the issue appears
- Identify if certain user segments or conditions trigger the issue more
- Note any workarounds users have discovered
- Consider both immediate and downstream impacts
- Be objective and evidence-based in your assessment`;

export const ANALYZE_ISSUE_PROMPT = ({
  issue,
  sessionIssues,
}: {
  issue: Partial<Issue>;
  sessionIssues: Array<SessionIssue & { session: Session }>;
}) => `Analyze this issue that has been detected across multiple user sessions.

# Issue Information
- Issue ID: ${issue.id}
- Project ID: ${issue.project_id}
- Created: ${issue.created_at}
- Total Occurrences: ${sessionIssues.length} session(s)

# Session Occurrences
This issue has been detected in ${sessionIssues.length} session(s). Here are the details:

${sessionIssues
  .sort((a, b) => new Date(b.session.created_at).getTime() - new Date(a.session.created_at).getTime())
  .map((si, index) => {
    const session = si.session;
    const timesText = si.times && Array.isArray(si.times) 
      ? `Occurred ${si.times.length} time(s) during session`
      : 'Timing information not available';
    
    return `
## Occurrence ${index + 1} - Session ${session.external_id}
- Date: ${new Date(session.created_at).toLocaleDateString()}
- User: ${session.project_user_id}
- Duration: ${session.active_duration ? `${Math.round(session.active_duration / 60)} minutes` : "Unknown"}
- ${timesText}

### Issue Manifestation in This Session
${si.story || "No specific story recorded"}

### Session Context
${session.story ? `**Session Story**: ${session.story}` : ""}
${session.health ? `\n**Session Health**: ${session.health}` : ""}
${session.score ? `\n**Session Score**: ${session.score}/100` : ""}
${session.observations && session.observations.length > 0 ? `\n**Key Observations**: ${session.observations.length} observation(s) recorded` : ""}
`;
  }).join("\n")}

Based on all these occurrences, provide a comprehensive analysis of this issue including its name, story, type, severity, priority, and your confidence level.`;

export const ANALYZE_ISSUE_SCHEMA = z.object({
  name: z.string().describe("A clear, actionable title that describes the problem directly without component or feature prefixes. Should be concise (3-8 words), specific about what's wrong, and scannable for developers. Use sentence case. Examples: 'Payment method validation fails silently', 'Avatar upload shows wrong error message', 'Search returns no relevant results'. Avoid generic terms like 'issue' or 'problem'."),
  story: z.string().describe("A comprehensive narrative in markdown body text that tells the complete story of this issue. Write as flowing paragraphs (NOT using markdown headers or templated sections). Start with a clear problem statement, then describe how it manifests across sessions, its impact on users, any patterns or triggers identified, and potential root causes. Use **bold** to emphasize key terms, issues, and impacts. Include specific examples from sessions. Write in present tense, be factual and evidence-based. Cover the following in natural prose: problem overview, user impact, pattern analysis, technical indicators, and business implications."),
  type: z.enum(["bug", "usability", "improvement", "feature"]).describe("Classify the issue type: 'bug' = something is broken or malfunctioning; 'usability' = works but causes user friction or confusion; 'improvement' = enhancement to existing functionality; 'feature' = new capability that doesn't exist"),
  severity: z.enum(["critical", "high", "medium", "low", "suggestion"]).describe("Technical/functional severity: 'critical' = complete failure, data loss, security issue; 'high' = major functionality impaired; 'medium' = moderate impact with workaround; 'low' = minor inconvenience; 'suggestion' = nice-to-have"),
  priority: z.enum(["immediate", "high", "medium", "low", "backlog"]).describe("Business priority for fixing: 'immediate' = fix now, business-critical; 'high' = next sprint, significant impact; 'medium' = upcoming release; 'low' = when convenient; 'backlog' = future consideration"),
  confidence: z.enum(["low", "medium", "high"]).describe("Confidence in this analysis: 'high' = clear pattern with consistent behavior across many sessions; 'medium' = visible pattern with some variations; 'low' = limited evidence or inconsistent manifestations"),
});