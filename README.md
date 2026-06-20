# Wedding App

A custom wedding guest app built with Next.js, Firebase, and a localized mobile-first UI. Guests can enter a greeting flow, save their name, take or upload photos, add short notes, and browse a shared gallery.

## What It Does

- Welcome and onboarding flow for guests
- Guest name capture stored locally in the browser
- Anonymous Firebase authentication
- Camera capture and phone upload support
- Shared gallery of submitted photos
- Optional notes on each photo
- Language switching for English, French, Punjabi, and Hebrew
- PWA-style install prompt and service worker registration

## Tech Stack

- Next.js 16
- React 19
- Firebase Auth, Firestore, and Storage
- TypeScript
- CSS Modules and global styles

## Getting Started

```bash
npm install
npm run dev
```

Open the app at `http://localhost:3000`.

## Common Scripts

```bash
npm run dev
npm run build
npm run start:prod
npm run lint
```

- `dev` starts the local Next.js dev server.
- `build` creates a production build.
- `start:prod` runs the built app.
- `lint` runs ESLint.

## App Flow

1. `/` redirects to `/welcome`.
2. Guests land on the welcome screen and enter their name.
3. The app stores onboarding state and the guest name in `localStorage`.
4. Guests enter `/app`, where they can switch between Capture and Gallery tabs.
5. Photos are uploaded to Firebase Storage and indexed in Firestore.

## Routes

- `/` - redirects to the welcome experience
- `/welcome` - entry screen and guest onboarding
- `/instructions` - redirects to the right place based on onboarding state
- `/app` - main capture and gallery experience

## Capture and Gallery

- Capture uses a live camera stream when available.
- Guests can also upload a photo from their phone.
- Each photo can include a short note.
- The app limits each guest to 20 photos.
- Note length is capped at 30 characters.
- Gallery browsing supports search and sorting.

## Data and Storage

The app currently uses the Firebase config in [`lib/firebase.ts`](./lib/firebase.ts).

It reads and writes to:

- Firestore `photos` collection
- Firestore `settings/app` document for upload enablement
- Firebase Storage under `photos/{uid}/...`

The app signs users in anonymously through Firebase Auth.

## Localization

Translations live in [`locales/`](./locales):

- `en.json`
- `fr.json`
- `pa.json`
- `he.json`

Language selection is handled through the shared i18n provider and the language selector in the app shell.

## Important Files

- [`app/layout.tsx`](./app/layout.tsx) - metadata, fonts, providers, and global app shell
- [`app/welcome/page.tsx`](./app/welcome/page.tsx) - welcome and onboarding flow
- [`app/app/page.tsx`](./app/app/page.tsx) - main app shell with tabs
- [`app/app/CaptureTab.tsx`](./app/app/CaptureTab.tsx) - camera/upload/photo submission flow
- [`app/app/GalleryTab.tsx`](./app/app/GalleryTab.tsx) - shared gallery view
- [`lib/guest.ts`](./lib/guest.ts) - guest name and onboarding persistence
- [`lib/i18n.ts`](./lib/i18n.ts) - dictionary loading and translation helpers
- [`lib/useAnonymousAuth.ts`](./lib/useAnonymousAuth.ts) - anonymous Firebase sign-in

## Notes

- Camera access requires HTTPS or `localhost`.
- The app is designed for mobile-first use.
- A service worker is registered when supported, but the app still works if registration fails.
- If you change Firebase project settings, update [`lib/firebase.ts`](./lib/firebase.ts).

## Deployment

Build the app and run the production server:

```bash
npm run build
npm run start:prod
```

If you deploy elsewhere, make sure the Firebase project, Firestore rules, and Storage rules are configured for the expected guest experience.
