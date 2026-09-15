# Calendar Automation — Project Plan

## 1. Goal

A web app where a user uploads an image of a class/work schedule (like a
university term schedule table) and the app automatically parses it and
creates matching recurring events on the user's **Google Calendar**, up to
a date the user specifies (e.g. "repeat until Dec 20, 2026" — end of term).

Core idea: **image in → structured schedule out → Google Calendar events out.**

## 2. Core Flow

1. User signs in (Google OAuth, since we need Calendar write access anyway).
2. User uploads a schedule image (e.g. the term schedule PNG/JPG).
3. Backend sends the image to an AI vision model to extract structured data:
   subject/course code, room, day(s) of week, start time, end time.
4. Extracted data is shown to the user in an editable review screen
   (AI extraction won't always be perfect — confirm before writing to Calendar).
5. User sets an end date (e.g. "until Dec 20, 2026") and confirms.
6. Backend creates **recurring events** on the user's Google Calendar via the
   Google Calendar API — one recurring event per subject/day pattern, using
   `RRULE` (e.g. `FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261220T000000Z`).
7. Extracted schedule + sync status is also stored in Supabase so the user can
   view/edit/re-sync later without re-uploading the image.

## 3. Tech Stack

- **Frontend:** React + Vite + Tailwind CSS (matches existing stack preference)
- **Backend/DB/Auth:** Supabase
  - Supabase Auth — but calendar write needs Google OAuth scopes, so auth
    should be **"Sign in with Google" via Supabase Auth's Google provider**,
    requesting the `https://www.googleapis.com/auth/calendar.events` scope
    at login. Supabase stores the Google `provider_token` /
    `provider_refresh_token` needed to call Calendar API on the user's behalf.
  - Supabase Storage — for uploaded schedule images
    (`schedule-images/{user_id}/{image_id}.jpg`)
  - Supabase Postgres — structured schedule data + sync logs, with Row Level
    Security so users only see their own data
  - Supabase Edge Functions — server-side logic (calling the vision model,
    calling Google Calendar API) instead of doing this in the browser, so
    API keys/tokens stay server-side
- **AI Vision (image → JSON):** GPT-4o or Gemini vision, prompted to return
  strict JSON matching a defined schedule schema (course, room, day, start,
  end). Same pattern used in the habit-tracker-app project.
- **Calendar Integration:** Google Calendar API (`events.insert` with
  `recurrence` field for RRULEs)

## 4. Data Model (Supabase)

- `schedule_uploads`
  - id, user_id, image_url, uploaded_at, status (pending/parsed/synced/error)
- `schedule_entries`
  - id, upload_id, user_id, course_code, room, day_of_week, start_time,
    end_time, color/label (optional), google_event_id (nullable, filled
    after sync)
- `sync_logs`
  - id, upload_id, user_id, synced_at, until_date, result (success/error),
    error_message (nullable)

## 5. Google Calendar API Integration Notes

- Use the OAuth token Supabase Auth already obtained from Google sign-in
  (avoids a second separate OAuth flow) — request the calendar scope up
  front at login.
- One Google Calendar **event per unique (course, day-of-week, start, end)**
  combination, not one event per week — use `recurrence: ["RRULE:FREQ=WEEKLY;
  BYDAY=...;UNTIL=..."]` so it's a single recurring series per class slot.
- Store the returned `google_event_id` per `schedule_entries` row so a
  re-sync can update (`events.patch`) or delete (`events.delete`) instead of
  duplicating events.
- Handle token refresh: Google access tokens expire — use the stored
  refresh token (server-side, in an Edge Function) to get a new access
  token when needed rather than asking the user to re-auth every time.

## 6. MVP Scope

**In scope for v1:**
- Google sign-in with Calendar scope
- Image upload
- AI vision extraction to structured JSON
- Editable review/confirmation screen before syncing
- End-date picker
- Push recurring events to Google Calendar
- View previously synced schedules, manual re-sync

**Out of scope for v1 (later):**
- Multi-calendar support (secondary calendars per term/subject)
- Editing individual event exceptions (e.g. "no class this one Wednesday")
- Non-Google calendar support (iCal export, Outlook, etc.)
- Mobile app version (this is the habit-tracker-app's territory — see that
  project if a mobile+Obsidian version is wanted instead)

## 7. Build Steps

1. Set up Supabase project: Auth (Google provider + calendar scope), tables
   above with RLS, Storage bucket for images.
2. Set up React + Vite + Tailwind frontend skeleton, Google sign-in flow.
3. Build image upload UI → Supabase Storage.
4. Build Edge Function: receives image URL, calls vision model with a
   strict-JSON prompt, writes result to `schedule_entries` as `pending`.
5. Build review/edit UI for extracted schedule entries.
6. Build Edge Function: takes confirmed entries + end date, calls Google
   Calendar API `events.insert` with RRULE per entry, stores
   `google_event_id`, updates status to `synced`.
7. Build "My Schedules" view: list past uploads/syncs, allow re-sync or
   delete (which should also delete the corresponding Google Calendar
   events via stored `google_event_id`s).
8. Polish: error handling for failed vision extraction (blurry image, no
   table detected) and failed Calendar API calls (expired token, quota).

## 8. Open Questions to Settle Before/During Build

- Should re-uploading a schedule for the same term **replace** old synced
  events, or always create new ones? (Recommend: replace, using stored
  `google_event_id`s to delete old events first.)
- What happens with color-coding in the source image (as seen in the sample
  schedule)? Could map to Google Calendar's per-event color field for a
  nicer visual match.
- Time zone handling — confirm all times are treated as Asia/Manila unless
  otherwise specified.
