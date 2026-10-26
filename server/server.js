// server/server.js
// Server entrypoint

const config = require('./config');

// 1. Enforce configuration validation before proceeding
try {
    config.validate();
} catch (err) {
    console.error(`[Fatal Startup Error] Configuration validation failed: ${err.message}`);
    process.exit(1);
}

// 2. Initialize database schema and seeds (fail fast if initialization fails)
let initDatabase;
try {
    initDatabase = require('./database/init');
    initDatabase();
} catch (err) {
    console.error(`[Fatal Startup Error] Database initialization failed: ${err.message}`);
    process.exit(1);
}

// 3. Load application and start HTTP Server only after validation and database succeed
let app;
try {
    app = require('./app');
} catch (err) {
    console.error(`[Fatal Startup Error] Application initialization failed: ${err.message}`);
    process.exit(1);
}

const server = app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🛍️  ShopEasy Server is running on:`);
    console.log(`👉  http://localhost:${config.port}`);
    console.log(`📡  Health check: http://localhost:${config.port}/api/health`);
    console.log(`⚙️   Environment: ${config.env}`);
    console.log(`====================================================`);
});

server.on('error', (err) => {
    console.error(`[Fatal Startup Error] HTTP Server failed to start: ${err.message}`);
    process.exit(1);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n[Shutdown] Shutting down ShopEasy gracefully...');
    server.close(() => {
        console.log('[Shutdown] HTTP server closed.');
        process.exit(0);
    });
});

module.exports = server;
