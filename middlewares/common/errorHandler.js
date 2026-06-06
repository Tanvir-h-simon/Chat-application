const createError = require('http-errors');

// 404 Not Found Middleware
function notFoundErrorHandler(req, res, next) {
    next(createError(404, "Page Not Found"));
}

// Default Error Handler Middleware
function defaultErrorHandler(err, req, res, next) {
    const error = process.env.NODE_ENV === 'development' ? err : { message: err.message };
    res.status(err.status || 500);

    if (req.accepts('html')) {
        res.render('error', { title: 'Error', error });
    } else {
        res.json(error);
    }
}

module.exports = {
    notFoundErrorHandler,
    defaultErrorHandler
};