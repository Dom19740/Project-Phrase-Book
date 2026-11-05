# Project Phrase Book

## Prerequisites

- Node.js and npm
- Vercel CLI for running or deploying the API: `npm install -g vercel`
- Android Studio or a configured Android SDK for Android builds

## Run locally from the CLI

```powershell
cd app
npm run dev
```



Vite will print the local web address, usually `http://localhost:5173`.

## Build

Build the web app:

```powershell
cd app
npm run build
```

The production files are written to `app/dist`.

Build the Android app:

```powershell
cd app
npm run android:sync
.\android\gradlew.bat -p android assembleRelease
```

The signed APK is written under `app/android/app/build/outputs/apk/release/` when `app/android/keystore.properties` is configured. Without release signing credentials, Gradle creates an unsigned release APK.

## Deploy

### Translation API

Deploy from the `proxy` directory:

```powershell
cd proxy
vercel login
vercel
vercel --prod
```

Configure `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` in the Vercel project environment settings.

### Web app

Set `VITE_TRANSLATE_API_URL` to the deployed API base URL, then deploy the built app from `app`:

```powershell
cd app
npm run build
vercel login
vercel --prod
```

Alternatively, upload the contents of `app/dist` to any static web host. Use the `app` directory as the project root and run `npm run build`.

### Android app

1. Build the web assets and sync them with Android: `cd app; npm run android:sync`.
2. Create `app/android/keystore.properties` with the release keystore path and credentials.
3. Build the Play Store bundle:

```powershell
cd app
.\android\gradlew.bat -p android bundleRelease
```

Upload the generated `.aab` from `app/android/app/build/outputs/bundle/release/` to Google Play Console.

### Marketing site

The marketing site is the static files in `marketing_site`. Upload that directory to the static host configured for the marketing domain.
