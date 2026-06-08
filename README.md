# Ping

A real-time chat application with one-to-one and group messaging, live presence,
typing indicators, read receipts, and file sharing. Built with Node.js, Express,
Socket.io, and MongoDB, wrapped in a responsive WhatsApp-style dark interface.

**Live demo:** https://ping-vhwy.onrender.com/

## Overview

Ping is a full-stack real-time messaging app. Users chat privately or in groups,
see who is online and who is typing, get read receipts and unread badges, and
share images and files. Accounts are provisioned by an admin rather than public
signup, so the app also includes an admin user-management area alongside
self-service profile and password settings.

The whole interface is server-rendered with EJS and progressively enhanced with
vanilla JavaScript, with Socket.io handling the live layer. There is no heavy
front-end framework, which keeps the app small and fast.

## Features

- Real-time one-to-one and group messaging over WebSockets
- Online presence, typing indicators, read receipts, and unread counts
- Image and file attachments
- Edit and delete your own messages, with live updates for everyone in the chat
- Group management: create, rename, add or remove members, set a group photo, leave or delete
- Admin user management, plus self-service profile editing and password change
- Message history with cursor-based pagination for fast loading

## Tech stack

- **Backend:** Node.js, Express 5
- **Real-time:** Socket.io (WebSockets)
- **Database:** MongoDB with Mongoose
- **Views:** EJS server-side templates with vanilla client-side JavaScript
- **Auth and security:** JSON Web Tokens in signed httpOnly cookies, bcrypt password hashing, Helmet with a tuned Content-Security-Policy
- **Deployment:** Render for the app, MongoDB Atlas for the database

## Engineering highlights

- **Unified auth across HTTP and WebSockets.** The Socket.io layer authenticates
  each connection with the same signed-cookie JWT the HTTP app uses, then joins
  rooms per conversation and per user so events can be targeted precisely.
- **Security by default.** Helmet sets the security headers with a custom CSP,
  cookies are signed, httpOnly, and SameSite, passwords are bcrypt-hashed, and
  failed logins trigger a per-account escalating lockout for non-admin users.
- **Built to stay responsive.** Messages load with cursor-based pagination, the
  hot query paths are indexed, and the inbox reads from a denormalized
  last-message snapshot and per-user read state instead of scanning every message.
- **Clean data lifecycle.** Deleting a conversation or a user removes all of its
  messages and uploaded files, so the database never accumulates orphaned data.

## Screenshots

### Login

![Ping login screen](screenshots/login.png)

### Chat

![Ping chat view with messages, image attachment, and online presence](screenshots/chat.png)

### Admin user management

![Admin manage-users page](screenshots/users.png)

### Profile and password settings

![Profile and change-password page](screenshots/profile.png)

## Getting started (local)

### Prerequisites

- Node.js 18 or newer
- A MongoDB database (local, or a free MongoDB Atlas cluster)

### Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values. Set `MONGO_URI`, and use
   long random strings (32+ characters) for `COOKIE_SECRET` and `JWT_SECRET`.

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

## Deployment

The app is deployed on Render with the database hosted on MongoDB Atlas.

- Set `NODE_ENV=production` on the host. This enables secure cookies and the
  trust-proxy setting, and disables automatic index builds.
- Set every variable from `.env.example` in the host's environment settings.
- After the first deploy, run `npm run indexes:sync` once against the database.
- Uploaded avatars and attachments are stored on local disk, which most hosts
  reset on redeploy. Attach a persistent disk if uploads need to survive restarts.

## Author

Tanvir Hossain — [GitHub](https://github.com/Tanvir-h-simon)
