// server/middleware/validation.js
// Request validation helpers

function validateRegister(req, res, next) {
    const { name, email, password } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Name is required and must be at least 2 characters long.'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
        return res.status(400).json({
            success: false,
            message: 'A valid email address is required.'
        });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long.'
        });
    }

    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();
    next();
}

function validateLogin(req, res, next) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Both email and password are required.'
        });
    }

    req.body.email = email.trim().toLowerCase();
    next();
}

module.exports = {
    validateRegister,
    validateLogin
};
