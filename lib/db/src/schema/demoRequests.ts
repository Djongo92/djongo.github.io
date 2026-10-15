import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const demoRequestsTable = pgTable(
  "demo_requests",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    firmName: text("firm_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("demo_requests_email_unique").on(table.email)],
);

export const insertDemoRequestSchema = createInsertSchema(demoRequestsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;
export type DemoRequest = typeof demoRequestsTable.$inferSelect;
