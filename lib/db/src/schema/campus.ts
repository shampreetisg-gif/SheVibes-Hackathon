import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campusUsers = pgTable("campus_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  initials: text("initials").notNull(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  publishedAt: text("published_at").notNull(),
  source: text("source").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
});

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  members: integer("members").notNull(),
  nextMeeting: text("next_meeting").notNull(),
  accent: text("accent").notNull(),
  avatar: text("avatar").notNull(),
  upcomingEvent: jsonb("upcoming_event").notNull(),
  announcements: jsonb("announcements").notNull(),
  discussions: jsonb("discussions").notNull(),
});

export const campusEvents = pgTable("campus_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  category: text("category").notNull(),
  color: text("color").notNull(),
});

export const deadlines = pgTable("deadlines", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  course: text("course").notNull(),
  dueDate: text("due_date").notNull(),
  dueLabel: text("due_label").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  type: text("type").notNull(),
  deadline: text("deadline").notNull(),
  description: text("description").notNull(),
  tag: text("tag").notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  course: text("course").notNull(),
  dueDate: text("due_date").notNull(),
  progress: integer("progress").notNull().default(0),
  status: text("status").notNull(),
});

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("Open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reportedBy: text("reported_by").notNull(),
});

export const insertIssueSchema = createInsertSchema(issues).pick({
  title: true,
  category: true,
  location: true,
  description: true,
});
export type InsertIssue = z.infer<typeof insertIssueSchema>;