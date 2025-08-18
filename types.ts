import { Database as DatabaseGenerated, Enums, Tables } from "@/schema";
import { MergeDeep } from "type-fest";

export type User = Tables<"users">;
export type Project = Tables<"projects">;
export type Role = Tables<"roles">;
export type Source = Tables<"sources">;
export type Destination = Tables<"destinations">;
export type Session = Tables<"sessions">;
export type Ticket = Tables<"tickets">;
export type SessionTicket = Tables<"session_tickets">;

export type ProjectPlan = Enums<"project_plan">;
export type SourceType = Enums<"source_type">;
export type DestinationType = Enums<"destination_type">;
export type SessionStatus = Enums<"session_status">;

export type Database = MergeDeep<DatabaseGenerated, {}>;
