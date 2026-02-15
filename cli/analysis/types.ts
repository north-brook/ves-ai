import type { VesaiConfig } from "../../config";
import type { PostHogRecording, SessionAnalysis } from "../../connectors";

export type CoreContext = {
  config: VesaiConfig;
  homeDir?: string;
};

export type RenderedSession = {
  sessionId: string;
  eventsUri: string;
  videoUri: string;
  videoDuration: number;
  renderedAt: string;
};

export type SessionAnalysisResult = {
  recording: PostHogRecording;
  render: RenderedSession;
  analysis: SessionAnalysis;
  markdownPath: string;
};
