# Ping

A simple real-time chat web app. Direct and group messaging with attachments,
typing indicators, online presence, read receipts, and unread badges. Accounts
are created by an admin, so there is no public signup.

## Tech stack

Node.js, Express 5, EJS, Socket.io, and MongoDB (Mongoose). Auth is a JWT stored
in a signed, httpOnly cookie. Helmet provides the security headers.

## Features

- Real-time 1:1 and group chats over Socket.io
- File and image attachments
- Edit and delete your own messages
- Unread counts, read receipts, typing indicators, and online presence
- Group management: rename, add or remove members, group photo, leave or delete
- Admin user management, plus self-service profile and password change

## Prerequisites

- Node.js 18 or newer
- A MongoDB database (local, or a free MongoDB Atlas cluster)

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values. Set `MONGO_URI`, and
   use long random strings (32+ characters) for `COOKIE_SECRET` and `JWT_SECRET`.

3. Create the first admin account (reads the `ADMIN_*` values from `.env`):

   ```
   npm run seed:admin
   ```

4. Start the app in development (auto-reloads on changes):

   ```
   npm run dev
   ```

   Open http://localhost:3000 and log in with the admin credentials. The admin
   can then create the rest of the users from the Users page.

## Scripts

- `npm run dev` — start with auto-reload (development)
- `npm start` — start the server (used in production)
- `npm run prod` — start locally in production mode
- `npm run seed:admin` — create the first admin account
- `npm run indexes:sync` — build database indexes (run once after deploying)

## Deployment notes

- Set `NODE_ENV=production` on your host. This enables secure cookies and the
  trust-proxy setting, and disables automatic index builds.
- Set every variable from `.env.example` in the host's environment settings.
- After the first deploy, run `npm run indexes:sync` once against your database.
- Uploaded avatars and attachments are stored on local disk. Many hosts wipe the
  disk on redeploy, so attach a persistent disk if you need uploads to survive
  restarts.
