# Secure Notes Frontend

Standalone HTML, CSS, and JavaScript frontend for the Secure Notes API. It serves static assets without a build step. ESLint and Prettier are development tools.

## Live project

| Resource                      | URL                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Website                       | [Secure Notes](https://secure-notes-frontend-rho.vercel.app)                        |
| Backend repository and setup  | [nayeem202/secure-notes-backend](https://github.com/nayeem202/secure-notes-backend) |
| Backend API base              | `https://secure-notes-backend-delta.vercel.app/api`                                 |
| Interactive API documentation | [Swagger UI](https://secure-notes-backend-delta.vercel.app/docs)                    |
| OpenAPI document              | [openapi.json](https://secure-notes-backend-delta.vercel.app/openapi.json)          |
| Public API example            | [GET /api/posts](https://secure-notes-backend-delta.vercel.app/api/posts)           |
| Database readiness            | [GET /health/ready](https://secure-notes-backend-delta.vercel.app/health/ready)     |

The website is public and does not require a Vercel account. Register to use private notes, or sign in with the reviewer credentials provided in the private submission email to test administrator views. The backend base URL is a prefix; GET `/api` itself is not a route.

## Run locally

Use Node.js 24.x. Start the backend using its [local setup instructions](https://github.com/nayeem202/secure-notes-backend#local-setup), then run this frontend in a second terminal:

```bash
git clone https://github.com/nayeem202/secure-notes-frontend.git
cd secure-notes-frontend
npm run dev
```

For an existing checkout, run `npm run dev` from this directory. Running the development server uses Node.js built-ins. In Windows PowerShell, use `npm.cmd run dev` if script execution policy blocks `npm.ps1`.

Open **http://localhost:5500**. The development server binds to `127.0.0.1:5500` and the frontend calls `http://localhost:3000/api`. Backend `.env` should contain:

```dotenv
APP_ORIGIN=http://localhost:5500
API_ORIGIN=http://localhost:3000
SERVE_FRONTEND=false
```

Use the exact configured frontend origin, since CORS distinguishes `localhost` from `127.0.0.1`.

## API configuration

[config.js](config.js) chooses the API base using the page hostname:

| Frontend hostname          | API base                                            |
| -------------------------- | --------------------------------------------------- |
| `localhost` or `127.0.0.1` | `http://localhost:3000/api`                         |
| Other hostnames            | `https://secure-notes-backend-delta.vercel.app/api` |

The production URL is already configured. To use another backend, edit the appropriate value in `config.js` and set that backend's `APP_ORIGIN` to the exact frontend origin without a trailing slash.

JWTs are sent through `Authorization: Bearer` and kept in memory. Reloading the standalone frontend requires signing in again. The frontend sends the write-protection header automatically.

## Features

- Register with a unique username; sign in with username or email
- Create, read, edit, and delete private notes
- Update your profile and change your password
- Read public posts and publish or manage your own posts
- Look up posts by username with a minimal public user response
- Administrator user management and read access to all notes
- Interest groups with paginated member usernames
- Pagination and visible API error messages

Administrator navigation appears after an administrator signs in. Administrators can read other users' notes; changes remain limited to the note's owner.

## Deployment

The current site runs on Vercel. Import this repository with Framework Preset **Other**; [vercel.json](vercel.json) sets an empty build command and serves the repository root.

For Netlify, [netlify.toml](netlify.toml) sets the publish directory to the repository root. Use no build command. For either host, keep the production API URL in `config.js` and backend `APP_ORIGIN` aligned with the deployed domains.

Check the website in a private browser window, then register/sign in and create a note. The site must be accessible without a hosting-provider account.

## Checks and source files

```bash
npm ci --include=dev
npm run verify
```

This runs ESLint, Prettier checks, and JavaScript syntax checks. Use `npm run format` to apply formatting or `npm run lint:fix` for available automatic lint fixes.

[CI](.github/workflows/ci.yml) is configured to run the same checks on every push and pull request using Node.js 24, read-only workflow permissions, and actions pinned to commit SHAs. Browser and full API verification results are recorded in the backend's [VERIFICATION.md](https://github.com/nayeem202/secure-notes-backend/blob/main/VERIFICATION.md).

| File             | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `index.html`     | Forms, views, navigation, and dialogs     |
| `app.js`         | Session state, API calls, and UI behavior |
| `config.js`      | Local/production API selection            |
| `styles.css`     | Existing page styles                      |
| `dev-server.mjs` | Local static server on port 5500          |
