# HabitFlow – Setup & Update Guide

Live at: https://shreedeep-solutions.github.io/habitflow/

## Files (upload ALL of these to the `habitflow` GitHub repo)

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `sw.js` | Offline support + auto-update |
| `manifest.json` | Makes it installable on phones |
| `icon-192.png`, `icon-512.png` | App icons (home screen) |
| `firestore.rules` | Security rules — paste into Firebase (NOT uploaded to GitHub, though it does no harm) |

## Updating the app on GitHub

1. Open the repo → **Add file → Upload files**.
2. Drag in the files above → **Commit changes**.
3. Wait 1–2 minutes. Everyone gets the new version automatically the next time they open the app
   (no more clearing cache).

## Firestore security rules (do this once)

1. Firebase Console → project **habits-70105** → **Firestore Database** (not Realtime Database) → **Rules** tab.
2. Select everything in the editor and delete it.
3. Open `firestore.rules`, copy everything, paste, click **Publish**.

What the rules do:
- Staff can see and change **only their own** habits.
- The admin (deepvernekar1097@gmail.com) can **view** everyone's habits, and create staff profiles.
- Nobody can read anything without logging in.

If the admin email ever changes, change it in **both** `index.html` (ADMIN_EMAIL) and `firestore.rules`.

## Daily use

- **Admin** logs in on the *Admin Login* tab: My Habits / Calendar / Staff Panel.
- **Add staff**: Staff Panel → **+ Add User** → share the email & password with them.
- **Forgot password**: on the login screen, type the email → tap *Forgot password?* → reset link arrives by email.
  The admin can also reset from Firebase Console → Authentication → Users.
- **Edit / delete a habit**: on a phone, tap the habit's name; on a computer, hover over it.
- **Remove a staff member**: Firebase Console → Authentication → Users → delete, and
  Firestore Database → `users` → delete their document.
- Closing the browser/app signs you out automatically.

## Free-tier limits (Firebase Spark)
50,000 reads / 20,000 writes per day — plenty for a team of 20–30.
