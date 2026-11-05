import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const guides = sqliteTable("guides", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});
export const researchRuns = sqliteTable("research_runs", {
  id: text("id").primaryKey(),
  client: text("client").notNull(),
  startedAt: integer("started_at").notNull(),
  status: text("status").notNull(),
  guideId: text("guide_id"),
});
