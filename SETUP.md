# HabitFlow v3 – Setup & User Guide (Shreedeep Solutions)

Live at: https://shreedeep-solutions.github.io/habitflow/
(after the custom domain step below: https://habits.shreedeepsolutions.com/)

## Files in the GitHub repo `shreedeep-solutions/habitflow`

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `sw.js`, `manifest.json` | Offline support, auto-update, installable app |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Home-screen icons (Shreedeep logo) |
| `logo-mark.png`, `logo-mark-white.png` | Logo used inside the app and on PDF reports |
| `firestore.rules` | Security rules — paste into Firebase (see below) |
| `monthly-email.gs`, `appsscript.json` | Optional: automatic monthly Excel email (see below) |

Updates reach everyone automatically the next time they open the app.

## 1. Firestore security rules (required after every rules change)

Firebase Console → project **habits-70105** → **Firestore Database** (not Realtime Database) → **Rules** →
select all, delete, paste the whole of `firestore.rules`, **Publish**.

What they enforce:
- Staff see/change only their own data; ticks only for today + the 3 previous days.
- Admin-assigned habits (📌) cannot be edited, archived or deleted by staff.
- Paused or removed staff are locked out. Comments and office settings are admin-only; the activity log can't be edited.
- The admin can view everyone, assign/archive/delete staff habits, manage profiles, and read saved staff passwords.

## 2. Custom domain habits.shreedeepsolutions.com (one-time)

1. Namecheap → Domain List → shreedeepsolutions.com → **Advanced DNS**.
2. If a record for `habits` already exists (e.g. from Netlify), delete it.
3. Add **CNAME Record** — Host: `habits` · Value: `shreedeep-solutions.github.io.` · TTL: Automatic. Save.
4. Wait 10–30 minutes, then tell Claude "DNS is done" — Claude adds the domain to the repo
   (or: GitHub repo → Settings → Pages → Custom domain → `habits.shreedeepsolutions.com` → Save → tick **Enforce HTTPS** once offered).
5. The old github.io link redirects automatically. Staff will need to sign in once on the new address and re-install the app icon.

## 3. Monthly email report (optional, free)

Emails last month's Excel to you on the 1st at ~8 AM. Do this from the Google account that **owns the Firebase project**.

1. Go to https://script.google.com → **New project**. Name it "HabitFlow monthly email".
2. Delete the sample code, paste all of `monthly-email.gs`. (Change `SEND_TO` at the top if needed.)
3. ⚙ **Project Settings** → tick **Show "appsscript.json" manifest file** → back in Editor open `appsscript.json`, replace its contents with ours. Save.
4. In the toolbar choose the function **setup** → **Run** → allow the permissions it asks for
   (Google shows "unverified app" because it's your own script: Advanced → Go to project).
5. You receive a test email within a minute. From now on it runs by itself every month.

If you'd rather not set this up: on the 1st–5th of each month the admin's Today screen shows a "report is ready — Download" button.

## Daily use

**Staff**
- Tap a circle to tick. **Hold** it (right-click on a computer) for notes, *skip* (doesn't count as missed), counts and timers.
- **Swipe** a habit right = done today, left = not done. Every change has an **Undo**.
- Tap a **date** at the top to mark that day as leave. Days older than 4 days are locked.
- Habit types: Yes/No, Count (e.g. 20 calls) and Timer (e.g. 30 min, with a built-in stopwatch).
- ↕ Reorder, 🗄 Archive (hides a habit but keeps its history), colours and icons in the habit editor.
- **Me** tab: streaks, best streaks, badges, month score, archived habits, leaderboard (if the admin turns it on).
- ⚙ Settings: dark mode, bigger text, stay signed in (works offline), install app.

**Admin**
- **Staff** tab: live sheet, "Not done yet today" with one-tap WhatsApp reminders, tap any cell for notes / late ticks / your comment.
- **⚙ Manage** a person: edit profile (photo, name, email, designation, employee ID, WhatsApp number, joining date), view the app as them,
  assign habits, activity log, change password, reset link, pause, delete habits, remove (restore or delete forever later from "Removed staff").
- **📌 Assign habit** to one person or the whole team.
- **Insights** tab: team tiles, trend charts, weekday analysis, best & weakest habits, leaderboard, compare two staff,
  star performer, monthly report cards / year-end summary (PDF), Excel/PDF export (everyone, filtered staff or only your habits).
- ⚙ Settings → Office settings: weekly off (Tuesday by default), office holidays, show leaderboard to staff.

## Free-tier limits (Firebase Spark)
50,000 reads / 20,000 writes per day — plenty for a team of 20–30.
