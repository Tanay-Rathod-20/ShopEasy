// server/middleware/errorHandler.js
// Centralized Express error-handling middleware

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
    
    // Log unexpected 500 errors to console for debugging, but never expose stack traces to client
    if (statusCode === 500) {
        console.error(`[Server Error] ${req.method} ${req.url}:`, err);
    }

    res.status(statusCode).json({
        success: false,
        message: err.message || 'An unexpected internal server error occurred.',
        ...(process.env.NODE_ENV === 'development' && { details: err.stack })
    });
}

module.exports = errorHandler;
