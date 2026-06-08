// Load environment variables
const dotenv = require("dotenv");
dotenv.config();

// External dependencies
const express = require("express");
const http = require("http");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

// Internal dependencies
const connectDB = require("./config/db");
const initSocket = require("./socket");
const loginRouter = require("./routers/loginRouter");
const userRouter = require("./routers/usersRouter");
const inboxRouter = require("./routers/inboxRouter");
const conversationRouter = require("./routers/conversationRouter");
const profileRouter = require("./routers/profileRouter");
const {
  notFoundErrorHandler,
  defaultErrorHandler,
} = require("./middlewares/common/errorHandler");

// Fail fast if any required secret/config is missing or too weak.
const requiredEnv = ["MONGO_URI", "COOKIE_SECRET", "JWT_SECRET", "PORT"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}
if (
  process.env.JWT_SECRET.length < 32 ||
  process.env.COOKIE_SECRET.length < 32
) {
  console.error(
    "JWT_SECRET and COOKIE_SECRET must each be at least 32 characters."
  );
  process.exit(1);
}

// Create Express app
const app = express();

// Trust the first proxy hop in production so that:
//  - req.ip reflects the real client IP (needed for rate limiting)
//  - secure cookies are recognised even after TLS is terminated upstream
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security headers via Helmet.
// CSP is configured to allow the CDN used by toastify and intl-tel-input.
// 'unsafe-inline' is required because EJS views use inline <script> blocks and
// onclick handlers. TODO: refactor to external JS files and remove 'unsafe-inline'.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        // Helmet's default is script-src-attr 'none', which blocks ALL inline
        // event handlers (onclick="..."). The views use onclick throughout, so
        // re-enable them here. TODO: move to addEventListener and drop this.
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        // Socket.io uses a WebSocket back to our own origin.
        connectSrc: ["'self'", "ws:", "wss:", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);

// Wrap the Express app in an HTTP server so Socket.io can share the same port.
const server = http.createServer(app);

// Database connection
connectDB();

// Real-time layer — capture the io instance so REST controllers can push events.
const io = initSocket(server);
app.set("io", io);

// Request parsing middleware — cap payload size to limit cheap DoS potential.
// File uploads go through multer and are unaffected by these limits.
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Set view engine
app.set("view engine", "ejs");

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Cookies parser middleware
app.use(cookieParser(process.env.COOKIE_SECRET));

// Routes
app.use("/", loginRouter);
app.use("/users", userRouter);
app.use("/inbox", inboxRouter);
app.use("/conversations", conversationRouter);
app.use("/profile", profileRouter);

// Error handling middleware
app.use(notFoundErrorHandler);
app.use(defaultErrorHandler);

// Start the server (note: server.listen, not app.listen, so sockets work)
server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
