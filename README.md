# Secure Notes Frontend

## Live deployment

- Frontend: [https://secure-notes-frontend-rho.vercel.app](https://secure-notes-frontend-rho.vercel.app)
- API: [https://secure-notes-backend-delta.vercel.app/api](https://secure-notes-backend-delta.vercel.app/api)
- Database readiness: [https://secure-notes-backend-delta.vercel.app/health/ready](https://secure-notes-backend-delta.vercel.app/health/ready)
- Frontend repository: https://github.com/nayeem202/secure-notes-frontend
- Backend repository: https://github.com/nayeem202/secure-notes-backend

The production URLs are public and do not require a Vercel account. Register through the website to use private notes. Admin setup is documented in the backend README.


Standalone vanilla HTML, CSS, and JavaScript frontend for the Secure Notes API. This folder is an independent project and can be submitted or deployed separately from `secure-notes-backend`.

## Local run

Start the backend first from `secure-notes-backend` in one terminal:

```powershell
cd D:\secure-notes-backend
.\start-windows-docker.cmd
```

In a second PowerShell window, start this frontend:

```powershell
cd D:\secure-notes-frontend
npm.cmd run dev
```

Open `http://localhost:5500`. The local frontend calls `http://localhost:3000/api`. Backend `.env` must have `APP_ORIGIN=http://localhost:5500` and `SERVE_FRONTEND=false`; those are the backend project's standalone defaults.

On Linux, run `npm run dev` from this directory after starting the backend, then open `http://localhost:5500`.

## Deploy on Vercel

Import this repository as a separate project with Framework Preset **Other**. The included `vercel.json` serves the root without a build. Replace the backend placeholder in `config.js` with the live HTTPS API URL ending in `/api`. Set backend `APP_ORIGIN` to this frontend's exact production origin.

Verify the production URL in a private browser window without a Vercel session. The reviewer must be able to load the page and use its registration/login form without signing in to Vercel.

## Deploy the frontend

1. Import `nayeem202/secure-notes-frontend` into Netlify as a static site. The included `netlify.toml` sets the publish directory to the repository root; no build command is needed.
2. Note the assigned `netlify.app` origin. Set backend `APP_ORIGIN` to this exact origin, including `https://` and without a trailing slash.
3. Edit `config.js` and replace `https://YOUR_BACKEND_DOMAIN/api` with the live backend API URL ending in `/api`, then commit and push the change. Netlify will redeploy automatically.

The frontend sends short-lived JWTs in the `Authorization` header and keeps them in memory only. Reloading a separately hosted frontend requires signing in again. Tokens are not saved in browser storage.

## Features

- Register with a unique username and sign in with username or email
- Create, read, update, and delete private notes
- Read public posts and create or manage your own posts
- Look up public posts by username without exposing profile names, email addresses, or interests
- Admin user management, all-notes view, and interest groups with paginated member usernames
- Paginated lists and API error messages
