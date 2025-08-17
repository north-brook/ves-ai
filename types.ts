import { Database as DatabaseGenerated, Enums, Tables } from "@/schema";
import { MergeDeep } from "type-fest";

export type User = Tables<"users">;
export type Project = Tables<"projects">;
export type Role = Tables<"roles">;
export type Source = Tables<"sources">;
export type Destination = Tables<"destinations">;

export type SourceType = Enums<"source_type">;
export type DestinationType = Enums<"destination_type">;

export type Database = MergeDeep<DatabaseGenerated, {}>;
