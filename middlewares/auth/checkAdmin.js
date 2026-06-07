const createError = require("http-errors");

// Authorization guard: allows only admins through.
// Must run AFTER checkLogin, which sets req.user from the JWT.
function checkAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  next(createError(403, "You do not have permission to access this page."));
}

module.exports = checkAdmin;
