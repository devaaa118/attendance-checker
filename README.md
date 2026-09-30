# Attendance Tracker
Client-side college attendance tracker (React + Vite + TypeScript + Tailwind + Dexie/IndexedDB, installable PWA). No backend, no login. Each browser keeps its own data.

## Run locally
    npm install
    npm run dev        # http://localhost:5173
    npm test           # calendar + attendance math tests
    npm run build      # production build in dist/

## Deploy (Vercel)
1. Push to GitHub (commands below). 2. vercel.com → Add New Project → import the repo. 3. Framework "Vite" is auto-detected; click Deploy. Share the URL.
(GitHub Pages also works: the build uses relative paths.)

## Git
    git init && git add . && git commit -m "Initial commit"
    git branch -M main
    git remote add origin <YOUR_REPO_URL>
    git push -u origin main

## Install as an app
Android Chrome: open the URL → ⋮ menu → Install app / Add to Home screen. iPhone: Safari → Share → Add to Home Screen.

## Data
Stored in the browser's IndexedDB (database `attendance-tracker`). Settings → Export data saves `attendance-backup-YYYY-MM-DD.json`; Import restores it after validation and confirmation.

## Rules
Sundays and second Saturdays are holidays (computed, not hard-coded). Custom holidays and working-day overrides win. Attendance = present / conducted, per class; cancelled classes are ignored; a lab entry is one class. Classes default to Present and are saved once you tap a button or mark a day.
