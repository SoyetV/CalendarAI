# Calendar Automation Project — Worklog

This file tracks work performed by all agents on the Calendar Automation project.

Project: A web app where users upload a schedule image, AI vision extracts structured
class/work entries, the user reviews/edits them, picks an end date, and the app
generates recurring calendar events (exported as an ICS file with RRULE that
imports into Google Calendar / Outlook / iCal). Schedules are persisted so users
can re-download or delete them later.

Stack adaptation (from the original Supabase + Vite plan):
- Next.js 16 App Router + TypeScript (instead of React + Vite)
- Prisma + SQLite (instead of Supabase Postgres)
- Local file storage in /public/uploads (instead of Supabase Storage)
- Next.js API routes (instead of Supabase Edge Functions)
- z-ai-web-dev-sdk VLM (instead of GPT-4o / Gemini)
- ICS file with RRULE download + persisted calendar_event_id (instead of direct
  Google Calendar API writes — sandbox has no real Google OAuth credentials, and
  ICS is the universal calendar import format the plan mentions as "out of scope"
  but is the practical equivalent here)
- Mock "Continue with Google" sign-in (sets a local session cookie) since the
  sandbox has no real Google OAuth client

---
Task ID: all
Agent: main (Z.ai Code)
Task: Build the complete Calendar Automation project from the uploaded plan (calendar-automation-plan.md), adapting the Supabase+Vite stack to the sandbox's Next.js 16 + Prisma/SQLite + z-ai-web-dev-sdk stack.

Work Log:
- Read the plan and mapped each requirement to the sandbox stack.
- Updated prisma/schema.prisma with User, ScheduleUpload, ScheduleEntry, SyncLog models (SQLite, cascading deletes, indexes). Ran `bun run db:push`.
- Built lib helpers:
  - src/lib/session.ts — cookie-based mock "Continue with Google" session (creates/reuses a single demo User row).
  - src/lib/vlm.ts — strict-JSON prompt VLM extractor using z-ai-web-dev-sdk createVision; defensive JSON parsing (strips ```json fences), normalizes 12h→24h times and weekday abbreviations.
  - src/lib/ics.ts — RFC 5545 ICS generator that groups entries by (course, room, start, end, color, notes) and emits ONE VEVENT per group with RRULE:FREQ=WEEKLY;BYDAY=...;UNTIL=..., matching the plan's recurring-event approach. Times converted from Asia/Shanghai wall-clock to UTC.
  - src/lib/types.ts — shared DTOs + constants (day options, color palette).
  - src/lib/api.ts — typed frontend API client.
  - src/lib/preview.ts — weekly preview grid + occurrence counter.
- Built API routes (all use requireUser() + ownership checks):
  - POST/DELETE /api/auth — sign in / sign out.
  - POST /api/upload — multipart image upload to public/uploads, creates ScheduleUpload.
  - POST /api/extract — runs VLM, replaces entries, sets status parsed/error.
  - POST/PUT/DELETE /api/entries[/[id]] — add/update/delete single entry during review (clears calendarEventId on edit so a re-sync is required).
  - POST /api/sync — builds ICS, persists to public/uploads/ics/{id}.ics, stamps calendarEventId on every entry, writes SyncLog, sets status synced.
  - GET /api/schedules, GET/DELETE /api/schedules/[id] — list / fetch / delete (also removes local image + ICS file).
  - GET /api/ics/[id] — serves persisted ICS, or builds on the fly with ?until= override.
- Built frontend (all 'use client', shadcn/ui, Tailwind 4, responsive):
  - sign-in-screen.tsx — hero + Continue with Google button.
  - app-header.tsx / app-footer.tsx — sticky header, mt-auto footer.
  - stepper.tsx — 3-step indicator (Upload → Review → Sync) with click-to-go-back.
  - upload-panel.tsx — drag-drop + click upload, preview, "Extract schedule" triggers upload+VLM.
  - review-panel.tsx — editable table (desktop grid / mobile labeled 2-col), inline auto-save on blur, add/delete rows, color swatches, day select, native time inputs.
  - sync-panel.tsx — end-date picker, 3-week preview grid, occurrence counter, "Generate N recurring events" → success screen with download + Google Calendar import instructions.
  - my-schedules.tsx — card grid with status badge, thumbnail, entry count, Open/Download/Delete (with AlertDialog confirm).
  - page.tsx — orchestrates session, stepper, active upload, and My Schedules; single user-visible route.
- Added allowedDevOrigins to next.config.ts to silence cross-origin dev warning.
- Updated layout metadata for the new app.

Self-verification (Agent Browser, end-to-end):
- Sign-in screen renders, "Continue with Google" creates session → dashboard appears.
- Uploaded a generated sample schedule PNG → preview shown → clicked "Extract schedule" → VLM returned 13/13 entries (CS 201 MWF 08:00-09:30, MATH 215 MWF 09:45-11:15, ENG 101 TTh 09:45-11:15, CS 201L TTh 13:00-15:00, PHYS 201 MW 15:15-16:45, PE 103 F 15:15-16:45) with course names, rooms, colors, and "Lec"/"Lab" notes.
- Review table rendered all 13 rows editable; edited "CS 201" → "CS 201 - EDITED", Tabbed out, verified via /api/schedules the PUT persisted; reverted.
- Stepper navigated Upload → Review → Sync; click-to-go-back worked.
- Sync panel showed date picker (default ~16 weeks out), 3-week preview grid with courses distributed across weekdays, and "Generate 13 recurring events".
- Clicked Generate → POST /api/sync 200, ICS auto-downloaded, success screen with "13 entries → recurring .ics downloaded" toast, download-again link, and Google Calendar import steps.
- Inspected the generated .ics: valid VCALENDAR, one VEVENT per (course,room,times) group with RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20270104T235959Z, correct UTC times (08:00 Asia/Shanghai = 00:00 UTC), proper comma escaping.
- "View my schedules" → synced card shows "Synced" badge, "13 entries · until 2027-01-04", course list, Open + Download .ics + Delete. Deleted a leftover error card via AlertDialog confirm.
- Sign out → sign-in screen returned.
- Mobile viewport (390×844): dashboard and review table (2-col labeled layout) render correctly.
- Sticky footer verified: sign-in page footer at exactly viewport bottom (900px); dashboard footer pushed to end of content (1320px scroll).
- bun run lint: 0 errors, 0 warnings. Dev log: all API calls 200 (the single 500 was the initial path-resolution bug in vlm.ts, fixed by treating imageUrl as a web path under /public rather than a filesystem-absolute path).

Stage Summary:
- Complete, production-shaped Calendar Automation app delivered on the sandbox stack.
- Core flow image-in → AI-extracted structured schedule → editable review → RRULE-recurring .ics works end-to-end and is browser-verified.
- Data persisted in Prisma/SQLite (ScheduleUpload, ScheduleEntry, SyncLog) so users can re-open, re-download, or delete schedules later.
- All MVP-scope items from the plan are implemented: mock Google sign-in, image upload, AI vision extraction, editable review, end-date picker, recurring event generation, and a "My Schedules" view with re-sync/download/delete.
- Out-of-scope items (multi-calendar, per-occurrence exceptions, non-Google calendar formats, mobile app) remain out of scope as the plan specified.
