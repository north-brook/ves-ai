import { Database as DatabaseGenerated, Enums, Tables } from "@/schema";
import { MergeDeep } from "type-fest";

export type User = Tables<"users">;
export type Project = Tables<"projects">;
export type Role = Tables<"roles">;
export type Source = Tables<"sources">;
export type Destination = Tables<"destinations">;

export type SessionDetectedFeature = {
  name: string;
  description: string;
  time: [number, number];
};
export type SessionDetectedIssue = {
  description: string;
  type: IssueType;
  severity: IssueSeverity;
  priority: IssuePriority;
  name: string;
  time: [number, number];
};

export type Session = MergeDeep<
  Tables<"sessions">,
  {
    detected_features: SessionDetectedFeature[] | null;
    detected_issues: SessionDetectedIssue[] | null;
  }
>;
export type ProjectUser = Tables<"project_users">;
export type ProjectGroup = Tables<"project_groups">;
export type Feature = Tables<"features">;
export type Issue = Tables<"issues">;

export type ProjectPlan = Enums<"project_plan">;
export type SourceType = Enums<"source_type">;
export type DestinationType = Enums<"destination_type">;
export type SessionStatus = Enums<"session_status">;
export type IssueType = Enums<"issue_type">;
export type IssueSeverity = Enums<"issue_severity">;
export type IssuePriority = Enums<"issue_priority">;
export type IssueStatus = Enums<"issue_status">;
export type FeatureStatus = Enums<"feature_status">;

export type Database = MergeDeep<
  DatabaseGenerated,
  {
    public: {
      Tables: {
        sessions: {
          Row: {
            detected_features: SessionDetectedFeature[] | null;
            detected_issues: SessionDetectedIssue[] | null;
          };
          Insert: {
            detected_features?: SessionDetectedFeature[] | null;
            detected_issues?: SessionDetectedIssue[] | null;
          };
          Update: {
            detected_features?: SessionDetectedFeature[] | null;
            detected_issues?: SessionDetectedIssue[] | null;
          };
        };
      };
    };
  }
>;
