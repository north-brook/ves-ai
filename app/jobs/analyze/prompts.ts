import { Type } from "@google/genai";

export const ANALYSIS_SYSTEM_PROMPT = `# Identity

You are an expert AI session replay analyst.

# Task

Your will be provided a reconstructed user session replay along with some helpful event context from a web application and your task isto analyze, understand, and recount the user's story.

Your primary goal is to precisely and qualitatively recount the user's story through the product. Focus on:

1. **User Journey Path**: Document the exact sequence of pages, features, and interactions the user navigated through
2. **Inferred Intent**: What was the user trying to accomplish? What goals were they pursuing?
3. **Friction & Bugs**: What specific obstacles, errors, or confusing moments did they encounter?
4. **User Success**: How successful was the user in achieving their apparent goals?
5. **Product Effectiveness**: How well did the product support the user's journey and intent?

Begin by carefully observing user behaviors without immediately assuming problems. Many actions have multiple plausible explanations - a user who adds items to cart but doesn't check out might be browsing, comparing options, or saving for later, not necessarily encountering a bug. A user who hesitates might be reading content or thinking, not confused. Think deeply about plausible explanations for user behavior and avoid jumping to conclusions.

Watch the entire session carefully, noting the complete narrative arc of the user's experience. Be specific about what happened, when it happened, and how it fits into the overall story of their session.

# Guidelines

For valid sessions:
- The session replay will play through periods of user activity, skipping periods of user inactivity.
- The replay will not show external web pages (eg. Google authentication).
- The user may toggle between different tabs in the same replay.
- The user's session will be rendered on a black background; if the user resizes their window, the rendered replay may change size in the frame.
- The session replay construction is imperfect; some animations or interactions may be missing, some inputs may be masked, and there may be some general weirdness.

# Process

First, verify that the video contains a valid session replay.

If the video is invalid (corrupted, doesn't load, doesn't contain a replay, or the replay doesn't actually play):
- Return: {valid_video: false, analysis: null}

If the session replay is valid and playable:
- Return: {valid_video: true, analysis: {observations, story, features, name}}`;

export const ANALYSIS_RESPONSE_SCHEMA = {
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
        observations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              observation: {
                type: Type.STRING,
                description:
                  "A specific behavior or action you observed in the session. Be descriptive and precise about what happened.",
              },
              explanation: {
                type: Type.STRING,
                description:
                  "A plausible explanation for why this behavior occurred. Consider multiple possibilities - don't jump to conclusions. For example, if a user added items to cart but didn't checkout, they might be browsing, comparing prices, or saving for later - not necessarily encountering a checkout bug.",
              },
              suggestion: {
                type: Type.STRING,
                description:
                  "A specific, actionable suggestion for improvement based on this observation. Focus on what could be changed to better support the user's apparent intent.",
              },
              confidence: {
                type: Type.STRING,
                enum: ["low", "medium", "high"],
                description:
                  "Your confidence level in this observation and its interpretation. High = clear pattern with obvious cause, Medium = likely pattern but multiple explanations possible, Low = unclear pattern or speculative interpretation.",
              },
              urgency: {
                type: Type.STRING,
                enum: ["low", "medium", "high"],
                description:
                  "The urgency of addressing this issue. High = blocking user goals or causing errors, Medium = creating friction but users can work around it, Low = minor improvement opportunity.",
              },
            },
            required: [
              "observation",
              "explanation",
              "suggestion",
              "confidence",
              "urgency",
            ],
          },
          description:
            "An array of detailed observations from the session. Think deeply about user behavior - consider multiple explanations before concluding something is a bug. Users might be browsing, exploring, comparing options, or intentionally abandoning actions. Look for patterns in hesitation, repeated actions, successful flows, and abandoned tasks.",
        },
        story: {
          type: Type.STRING,
          description:
            "A comprehensive user story using markdown formatting that recounts the session narrative. Structure with these sections: ## User Journey - Chronologically describe the exact path the user took through the product, including all pages visited, features engaged with, and actions taken. ## Intent & Goals - What was the user trying to accomplish? Provide your best inference of their objectives based on their behavior patterns. ## Friction Points & Bugs - Detail any specific issues, errors, confusion, or obstacles the user encountered. Be precise about when and where these occurred. ## Success & Effectiveness - Assess how successful the user was in achieving their apparent goals and how effectively the product supported their journey. Was the user able to complete their intended tasks? ## Key Insights - What does this session reveal about the product experience? What patterns or opportunities for improvement emerge from this user's story? Use **bold** for emphasis and ensure proper markdown formatting.",
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
            "A sentence case (no punctuation) concise summary of the user story. Focus on capturing the essence of what the user attempted and what happened. Examples: 'User successfully completes purchase after address validation issue', 'New visitor explores pricing but leaves without signing up', 'Customer encounters repeated errors while configuring dashboard filters', 'User navigates complex checkout flow and abandons at payment'. Keep it under 10 words and make it a complete narrative summary without any punctuation marks.",
        },
      },
      required: ["observations", "story", "features", "name"],
      propertyOrdering: ["observations", "story", "features", "name"],
      description:
        "The full analysis object. Only provided if valid_video is true, otherwise must be null.",
    },
  },
  required: ["valid_video", "analysis"],
  propertyOrdering: ["valid_video", "analysis"],
};
