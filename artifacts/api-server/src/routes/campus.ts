import { and, asc, desc, ilike } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateIssueBody,
  CreateIssueResponse,
  DemoAuthBody,
  DemoAuthResponse,
  GetAnnouncementsQueryParams,
  GetAnnouncementsResponse,
  GetAssignmentsResponse,
  GetClubsResponse,
  GetDashboardResponse,
  GetDeadlinesResponse,
  GetEventsResponse,
  GetIssuesResponse,
  GetOpportunitiesResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import {
  announcements,
  assignments,
  campusEvents,
  campusUsers,
  clubs,
  deadlines,
  issues,
  opportunities,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const demoUsers = {
  Student: { name: "Aarav Mehta", email: "aarav.mehta@demo.campussync", initials: "AM" },
  Faculty: { name: "Dr. Maya Rao", email: "maya.rao@demo.campussync", initials: "MR" },
  "Club President": { name: "Riya Kapoor", email: "riya.kapoor@demo.campussync", initials: "RK" },
  "Club Vice President": { name: "Kabir Shah", email: "kabir.shah@demo.campussync", initials: "KS" },
  Administrator: { name: "Nisha Iyer", email: "nisha.iyer@demo.campussync", initials: "NI" },
} as const;

const toAnnouncement = (row: typeof announcements.$inferSelect) => ({
  ...row,
  isPinned: Boolean(row.isPinned),
});

const toIssue = (row: typeof issues.$inferSelect) => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});

router.post("/demo-auth", async (req, res) => {
  const parsed = DemoAuthBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose one of the available demo roles." });
    return;
  }

  const profile = demoUsers[parsed.data.role as keyof typeof demoUsers];
  const [user] = await db
    .insert(campusUsers)
    .values({ ...profile, role: parsed.data.role })
    .returning();

  res.json(DemoAuthResponse.parse(user));
});

router.get("/dashboard", async (req, res) => {
  const [user] = await db.select().from(campusUsers).orderBy(asc(campusUsers.id)).limit(1);
  const [announcementRows, eventRows, deadlineRows, clubRows, opportunityRows, assignmentRows, issueRows] =
    await Promise.all([
      db.select().from(announcements).orderBy(desc(announcements.isPinned), desc(announcements.id)).limit(3),
      db.select().from(campusEvents).orderBy(asc(campusEvents.id)).limit(4),
      db.select().from(deadlines).orderBy(asc(deadlines.id)).limit(4),
      db.select().from(clubs),
      db.select().from(opportunities),
      db.select().from(assignments),
      db.select().from(issues),
    ]);

  const dashboard = {
    user: user ?? { id: 0, name: "Aarav Mehta", email: "aarav.mehta@demo.campussync", role: "Student", initials: "AM" },
    stats: [
      { label: "Unread announcements", value: String(announcementRows.length + 4), detail: "4 new since Monday", tone: "blue" },
      { label: "Upcoming deadlines", value: String(deadlineRows.length), detail: "Next one in 2 days", tone: "amber" },
      { label: "Saved opportunities", value: String(opportunityRows.length), detail: "2 closing this week", tone: "mint" },
      { label: "Active issues", value: String(issueRows.filter((issue) => issue.status !== "Resolved").length), detail: "Campus team is on it", tone: "rose" },
    ],
    announcements: announcementRows.map(toAnnouncement),
    events: eventRows,
    deadlines: deadlineRows,
  };

  res.json(GetDashboardResponse.parse(dashboard));
});

router.get("/announcements", async (req, res) => {
  const parsed = GetAnnouncementsQueryParams.safeParse(req.query);
  const query = parsed.success ? parsed.data.q?.trim() : undefined;
  const rows = query
    ? await db
        .select()
        .from(announcements)
        .where(ilike(announcements.title, `%${query}%`))
        .orderBy(desc(announcements.isPinned), desc(announcements.id))
    : await db.select().from(announcements).orderBy(desc(announcements.isPinned), desc(announcements.id));
  res.json(GetAnnouncementsResponse.parse(rows.map(toAnnouncement)));
});

router.get("/clubs", async (_req, res) => {
  const rows = await db.select().from(clubs).orderBy(asc(clubs.name));
  res.json(GetClubsResponse.parse(rows));
});

router.get("/events", async (_req, res) => {
  const rows = await db.select().from(campusEvents).orderBy(asc(campusEvents.id));
  res.json(GetEventsResponse.parse(rows));
});

router.get("/deadlines", async (_req, res) => {
  const rows = await db.select().from(deadlines).orderBy(asc(deadlines.id));
  res.json(GetDeadlinesResponse.parse(rows));
});

router.get("/opportunities", async (_req, res) => {
  const rows = await db.select().from(opportunities).orderBy(asc(opportunities.id));
  res.json(GetOpportunitiesResponse.parse(rows));
});

router.get("/assignments", async (_req, res) => {
  const rows = await db.select().from(assignments).orderBy(asc(assignments.id));
  res.json(GetAssignmentsResponse.parse(rows));
});

router.get("/issues", async (_req, res) => {
  const rows = await db.select().from(issues).orderBy(desc(issues.id));
  res.json(GetIssuesResponse.parse(rows.map(toIssue)));
});

router.post("/issues", async (req, res) => {
  const parsed = CreateIssueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Add a title, location, category, and a short description." });
    return;
  }

  const [issue] = await db
    .insert(issues)
    .values({ ...parsed.data, reportedBy: "Aarav Mehta" })
    .returning();

  logger.info({ issueId: issue.id }, "Campus issue reported");
  res.status(201).json(CreateIssueResponse.parse(toIssue(issue)));
});

export default router;