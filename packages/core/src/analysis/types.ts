import type { VesaiConfig } from "../../../config/src";
import type {
  PostHogRecording,
  SessionAnalysis,
} from "../../../connectors/src";

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
