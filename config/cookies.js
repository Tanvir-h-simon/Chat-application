const isProd = process.env.NODE_ENV === "production";

// Shared options for the auth + flash cookies so set/clear always match.
// SameSite=Lax is the primary CSRF defense: browsers won't send this cookie
// on cross-site POST/DELETE requests, which covers all state-changing routes.
const baseCookieOptions = {
  httpOnly: true,
  signed: true,
  sameSite: "lax",
  secure: isProd, // only sent over HTTPS in production
  path: "/",
};

const tokenCookieOptions = {
  ...baseCookieOptions,
  maxAge: 24 * 60 * 60 * 1000, // 24h
};

module.exports = { baseCookieOptions, tokenCookieOptions };
