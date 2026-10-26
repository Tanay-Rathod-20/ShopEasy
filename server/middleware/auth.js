// server/middleware/auth.js
// Authentication and Authorization middleware using JWT

const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database/db');

/**
 * Middleware: Verifies the JWT token from Authorization header (Bearer <token>)
 * Attaches decoded user { id, email, role, name } to req.user
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Authentication token required.'
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Verify user still exists in database
        const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session. User no longer exists.'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token.'
        });
    }
}

/**
 * Middleware: Optional authentication. If a valid token is provided, attaches req.user; otherwise req.user is null.
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id);
        req.user = user || null;
    } catch (err) {
        req.user = null;
    }
    next();
}

/**
 * Middleware: Requires the authenticated user to have the 'admin' role
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Forbidden. Administrator privileges required.'
        });
    }
    next();
}

module.exports = {
    authenticateToken,
    optionalAuth,
    requireAdmin
};
