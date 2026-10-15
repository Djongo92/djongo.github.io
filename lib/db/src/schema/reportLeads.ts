import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportLeadsTable = pgTable(
  "report_leads",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    source: text("source").notNull().default("q2-2026-serbia-report"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("report_leads_email_unique").on(table.email)],
);

export const insertReportLeadSchema = createInsertSchema(reportLeadsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReportLead = z.infer<typeof insertReportLeadSchema>;
export type ReportLead = typeof reportLeadsTable.$inferSelect;
