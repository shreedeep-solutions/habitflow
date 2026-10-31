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
- The admin (deepvernekar1097@gmail.com) can **view** everyone's habits, delete staff habits,
  create/remove staff, and read the saved staff passwords (no one else can).
- Removed staff are locked out.
- Nobody can read anything without logging in.

If the admin email ever changes, change it in **both** `index.html` (ADMIN_EMAIL) and `firestore.rules`.

## Daily use

- **Admin** logs in on the *Admin Login* tab: My Habits / Calendar / Staff Panel.
- **Add staff**: Staff Panel → **+ Add User** → share the email & password with them.
- **Manage a staff member** (admin): Staff Panel → **⚙ Manage** next to their name. From there you can
  delete single habits, delete all their habits, change their password, send a reset link, or remove them.
- **Change a staff password** (admin): Manage → *Change password*. For staff created before this feature,
  the app asks for their current password once; after that it remembers it.
- **Forgot password** (staff): on the login screen, type the email → tap *Forgot password?* → reset link arrives by email.
- **Remove a staff member**: Manage → *Remove user* (type DELETE to confirm). Their habits and history are deleted
  and they are signed out at once. If the app knew their password, their login is deleted too; otherwise it is
  blocked, and you can delete it in Firebase Console → Authentication → Users if you want to reuse the email.
- **Edit / delete your own habit**: on a phone, tap the habit's name; on a computer, hover over it.
- Closing the browser/app signs you out automatically.

## Free-tier limits (Firebase Spark)
50,000 reads / 20,000 writes per day — plenty for a team of 20–30.
