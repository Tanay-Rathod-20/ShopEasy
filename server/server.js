// server/server.js
// Server entrypoint

const app = require('./app');
const config = require('./config');
const initDatabase = require('./database/init');

// Automatically initialize schema and seeds if not already done
try {
    initDatabase();
} catch (err) {
    console.error('[Startup] Database initialization warning:', err.message);
}

// Start HTTP Server
const server = app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🛍️  ShopEasy Server is running on:`);
    console.log(`👉  http://localhost:${config.port}`);
    console.log(`📡  Health check: http://localhost:${config.port}/api/health`);
    console.log(`⚙️   Environment: ${config.env}`);
    console.log(`====================================================`);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n[Shutdown] Shutting down ShopEasy gracefully...');
    server.close(() => {
        console.log('[Shutdown] HTTP server closed.');
        process.exit(0);
    });
});
