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

[Ping login screen]<img width="1919" height="1116" alt="Screenshot 2026-06-09 021919" src="https://github.com/user-attachments/assets/f92688e4-fbb6-45ac-9191-3e5f9a2a8a6f" />


### Chat

[Ping chat view with messages, image attachment, and online presence]<img width="1919" height="1079" alt="Screenshot 2026-06-09 021822" src="https://github.com/user-attachments/assets/6679b266-1542-4b91-ab47-067ebd8abf45" />


### Admin user management

[Admin manage-users page]<img width="1919" height="1117" alt="Screenshot 2026-06-09 020428" src="https://github.com/user-attachments/assets/38174fc0-ea33-47e9-b202-e55091435cac" />


### Profile and password settings

[Profile and change-password page]<img width="1919" height="1113" alt="Screenshot 2026-06-09 020439" src="https://github.com/user-attachments/assets/5df69341-0475-4ec2-9aba-19baf6c04e91" />


## Getting started

### Prerequisites

- Node.js 18 or newer
- A MongoDB database, either a local server or a free MongoDB Atlas cluster

### Setup

1. Install the dependencies:

   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:

- `MONGO_URI` — MongoDB connection string
- `COOKIE_SECRET` — Random string, at least 32 characters
- `JWT_SECRET` — Random string, at least 32 characters
- `ADMIN_NAME` — Name for the first admin account
- `ADMIN_EMAIL` — Email for the first admin account
- `ADMIN_PASSWORD` — Password for the first admin account

3. Create the first admin account. This reads the `ADMIN_*` values from `.env`:

   ```
   npm run seed:admin
   ```

4. Start the development server, which auto-reloads on changes:

   ```
   npm run dev
   ```

Open http://localhost:3000 and log in with your admin credentials. From the Users
page, the admin creates the other accounts. To see the real-time features, log in
as two different users in two browser windows and message between them.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with auto-reload (development) |
| `npm start` | Start the server (used in production) |
| `npm run prod` | Start locally in production mode |
| `npm run seed:admin` | Create the first admin account |
| `npm run indexes:sync` | Build the database indexes (run once after a deploy) |

## Deployment

The live version runs on Render, with the database on MongoDB Atlas.

## Author

Tanvir Hossain — [GitHub](https://github.com/Tanvir-h-simon)
