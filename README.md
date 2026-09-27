# 🪔 Problem Hai To Solution Hai – Puchiye Pandit Ji Se

A free web app. It is hosted on **GitHub Pages** and opened from a link.

- A disclaimer shows every time the module opens. The user must agree before continuing.
- Login uses a mobile number and OTP.
- Users can ask a problem, or request a Janam Patrika (Kundli).
- **History is saved against the mobile number.** The user sees all past questions and Pandit Ji's answers whenever they log in again.
- Pandit Ji has a separate page, `pandit.html`, to read requests and send answers. Pandit Ji can also attach a Patrika PDF link.
- Everything is free. There is no payment anywhere.

## Files
| File | Purpose |
|---|---|
| `index.html` + `app.js` | User app (disclaimer, OTP login, ask, Janam Patrika, history) |
| `pandit.html` | Pandit Ji's answer panel |
| `firebase-config.js` | Your Firebase keys (paste here) |
| `style.css` | Design |
| `firestore.rules` | Security: users see only their own data |

## Why Firebase?
GitHub Pages only shows HTML pages. It **cannot send OTP SMS or save data** by itself.
Firebase, a Google service, does both on its **free Spark plan**.
- The free plan has a small daily limit on real OTP SMS. Check the current limit in the Firebase console, under Authentication → Settings → SMS.
- For testing, add "test phone numbers" with a fixed OTP. These cost nothing.

---

## Setup (one time, about 20 minutes)

### 1. Create a Firebase project
1. Go to https://console.firebase.google.com and click **Add project**. Analytics is not needed.
2. Open **Build → Authentication → Get started**. Under **Sign-in method**, enable **Phone**.
   - Optional: under *Phone numbers for testing*, add `+91 9999999999` with code `123456`.
3. Open **Build → Firestore Database → Create database**. Choose production mode and the location `asia-south1` (Mumbai).
4. In Firestore, open the **Rules** tab. Paste the full contents of `firestore.rules`, then click **Publish**.
5. Go to **Project settings (⚙) → General → Your apps**. Click the **Web (</>)** icon to register an app, then copy the `firebaseConfig` values into `firebase-config.js`.

### 2. Add Pandit Ji's mobile number (admin)
In Firestore, click **Start collection** and enter:
- Collection ID: `admins`
- Document ID: `+91XXXXXXXXXX` (Pandit Ji's number, with +91 and no spaces)
- Add one field, for example `name` (string) = `Pandit Ji`.

Only numbers listed here can open `pandit.html`. To add more pandits, add more documents.

### 3. Put it on GitHub Pages
1. On GitHub, go to **New repository**, name it for example `pandit-ji`, and make it Public.
2. Click **Add file → Upload files** and upload all files from this folder. Then click Commit.
3. Go to repo **Settings → Pages**. Set Source to *Deploy from a branch*, Branch to `main`, and folder to `/ (root)`, then click Save.
4. After about a minute your link is ready:
   - User link: `https://<your-github-username>.github.io/pandit-ji/`
   - Pandit link: `https://<your-github-username>.github.io/pandit-ji/pandit.html`

### 4. Allow your GitHub link in Firebase (required for OTP)
In Firebase, go to **Authentication → Settings → Authorized domains → Add domain** and add `<your-github-username>.github.io`.

Done. Share the user link on WhatsApp or social media.

---

## How it works
1. The user opens the link, agrees to the disclaimer, and logs in with OTP.
2. The user asks a problem or requests a Janam Patrika. It is saved with the user's mobile number and status **Pending**.
3. Pandit Ji logs in on `pandit.html`, sees pending requests, and writes the answer. Pandit Ji can add a Google Drive link to the Patrika PDF if needed.
4. The status changes to **Answered**. The user sees the answer in **My History** right away, or the next time they log in.

## Privacy note
Users' birth details and phone numbers are personal data. The security rules make sure each user sees only their own records, and only Pandit Ji sees everyone's. Nothing is ever deleted, so history is always available for review.
