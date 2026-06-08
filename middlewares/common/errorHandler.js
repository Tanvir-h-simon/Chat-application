const createError = require('http-errors');

// 404 Not Found Middleware
function notFoundErrorHandler(req, res, next) {
    next(createError(404, "Page Not Found"));
}

// Default Error Handler Middleware
function defaultErrorHandler(err, req, res, next) {
  console.error(err); // full error (with stack) goes to the server log only

  const status = err.status || 500;
  res.status(status);

  // Show the real message for client errors (4xx); hide internals for 5xx.
  const message =
    status < 500 ? err.message : "Something went wrong on our end.";

  if (req.accepts("html")) {
    res.render("error", { title: status + " Error", status, message });
  } else {
    res.json({ status, message });
  }
}

module.exports = {
    notFoundErrorHandler,
    defaultErrorHandler
};