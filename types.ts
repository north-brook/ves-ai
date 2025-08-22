import { Database as DatabaseGenerated, Enums, Tables } from "@/schema";
import { MergeDeep } from "type-fest";

export type User = Tables<"users">;
export type Project = Tables<"projects">;
export type Role = Tables<"roles">;
export type Source = Tables<"sources">;
export type Destination = Tables<"destinations">;

type Observation = {
  observation: string;
  explanation: string;
  suggestion: string;
  confidence: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high";
};
export type Session = MergeDeep<
  Tables<"sessions">,
  {
    observations: Observation[] | null;
  }
>;
export type Ticket = Tables<"tickets">;
export type SessionTicket = Tables<"session_tickets">;

export type ProjectPlan = Enums<"project_plan">;
export type SourceType = Enums<"source_type">;
export type DestinationType = Enums<"destination_type">;
export type SessionStatus = Enums<"session_status">;

export type Database = MergeDeep<
  DatabaseGenerated,
  {
    public: {
      Tables: {
        sessions: {
          Row: {
            observations: Observation[] | null;
          };
          Insert: {
            observations?: Observation[] | null;
          };
          Update: {
            observations?: Observation[] | null;
          };
        };
      };
    };
  }
>;
