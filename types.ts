import { Database as DatabaseGenerated, Enums, Tables } from "@/schema";
import { MergeDeep } from "type-fest";

export type User = Tables<"users">;
export type Project = Tables<"projects">;
export type Role = Tables<"roles">;
export type Source = Tables<"sources">;
export type Destination = Tables<"destinations">;

export type SessionDetectedPages = {
  path: string;
  times: [number, number][];
  story: string;
};
export type SessionDetectedIssue = {
  name: string;
  type: IssueType;
  severity: IssueSeverity;
  priority: IssuePriority;
  times: [number, number][];
  story: string;
};

export type Session = MergeDeep<
  Tables<"sessions">,
  {
    detected_pages: SessionDetectedPages[] | null;
    detected_issues: SessionDetectedIssue[] | null;
  }
>;
export type ProjectUser = Tables<"project_users">;
export type ProjectGroup = Tables<"project_groups">;
export type Page = Tables<"pages">;
export type Issue = Tables<"issues">;

export type ProjectPlan = Enums<"project_plan">;
export type SourceType = Enums<"source_type">;
export type DestinationType = Enums<"destination_type">;
export type SessionStatus = Enums<"session_status">;
export type IssueType = Enums<"issue_type">;
export type IssueSeverity = Enums<"issue_severity">;
export type IssuePriority = Enums<"issue_priority">;
export type IssueStatus = Enums<"issue_status">;
export type PageStatus = Enums<"page_status">;

export type Database = MergeDeep<
  DatabaseGenerated,
  {
    public: {
      Tables: {
        sessions: {
          Row: {
            detected_pages: SessionDetectedPages[] | null;
            detected_issues: SessionDetectedIssue[] | null;
          };
          Insert: {
            detected_pages?: SessionDetectedPages[] | null;
            detected_issues?: SessionDetectedIssue[] | null;
          };
          Update: {
            detected_pages?: SessionDetectedPages[] | null;
            detected_issues?: SessionDetectedIssue[] | null;
          };
        };
      };
    };
  }
>;
