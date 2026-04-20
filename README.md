# Mood SE Multi-Project Setup

This repository contains three independent JavaScript/TypeScript projects:

- Backend API: `mood-backend`
- Web frontend (Vite + React): `mood-module`
- Mobile frontend (Expo + React Native): `myApp`

Each project has its own dependencies and lockfile.

Important rule: install and run commands inside each project folder, not at repository root.

## 1) Prerequisites

Install these first:

- Node.js LTS (recommended: Node 20)
- npm (comes with Node.js)
- Git

For mobile development, also install:

- Expo Go app on your phone (quickest start), or
- Android Studio emulator, and/or
- Xcode simulator (macOS only)

## 2) Repository Structure

```text
mood-se/
  mood-backend/   # API server
  mood-module/    # Web app
  myApp/          # Mobile app
```

## 3) First-Time Setup (Install Dependencies)

Run these commands one project at a time:

### Backend

```bash
cd mood-backend
npm install
```

### Web frontend

```bash
cd mood-module
npm install
```

### Mobile frontend

```bash
cd myApp
npm install
```

## 4) Run Commands by Project

Open separate terminals so projects can run together.

### A) Backend (API)

From `mood-backend`:

```bash
npm run dev
```

Other useful backend scripts:

```bash
npm run test:reminder-flow
npm run demo:workflow
```

### B) Web frontend

From `mood-module`:

```bash
npm run dev
```

Other useful web scripts:

```bash
npm run build
npm run preview
npm run lint
```

### C) Mobile frontend

From `myApp`:

```bash
npm run start
```

Then choose a target from Expo terminal UI, or run directly:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## 5) Recommended Daily Developer Workflow

Use this simple routine:

1. Pull latest code.
2. Open 2-3 terminals (backend, web, mobile as needed).
3. Start only the projects you are actively working on.
4. Make changes and verify in the relevant app.
5. Run lint/tests for the project you changed.
6. Commit only source changes (never dependency folders).

Example day when working on API + web:

Terminal 1:

```bash
cd mood-backend
npm run dev
```

Terminal 2:

```bash
cd mood-module
npm run dev
```

## 6) Beginner-Friendly Debug Tips

### Backend debugging (VS Code)

Option 1 (quick):

1. Open `mood-backend` folder in VS Code.
2. Open a JavaScript Debug Terminal.
3. Run `npm run dev` in that debug terminal.
4. Set breakpoints in backend files.

Option 2 (attach):

- Start backend with Node inspect mode manually and attach from VS Code.

### Web debugging

1. Run `npm run dev` in `mood-module`.
2. Open the local Vite URL shown in terminal.
3. Use browser DevTools and React DevTools extension.

### Mobile debugging

1. Run `npm run start` in `myApp`.
2. Open app with Expo Go or emulator.
3. Use Expo developer menu for logs and debugging options.

## 7) Common Mistakes to Avoid

- Do not run `npm install` at repository root.
- Do not create a root `package.json` for combined installs.
- Do not share `node_modules` between projects.
- Do not commit generated build folders.

## 8) Quick Health Check

To verify each project is healthy, run inside each folder:

```bash
npm ls --depth=0
```

If this command completes without dependency errors, that project setup is valid.

## 9) Troubleshooting

### Port already in use

- Stop old terminal processes.
- Restart the relevant project.

### Dependency issues in one project

Inside that specific project only:

```bash
rm -rf node_modules package-lock.json
npm install
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### Mobile app cannot connect to API

- Confirm backend is running.
- Confirm mobile app API base URL points to reachable host/IP.
- If testing on a physical phone, localhost usually will not work unless tunneled.
