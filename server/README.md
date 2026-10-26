# Server Backend Directory

This directory contains the Node.js + Express backend application structured using the MVC / layered pattern:

- `config/` : Environment configuration loader and constants.
- `database/` : SQLite database connection, `schema.sql`, `seed.sql`, and initialization script.
- `middleware/` : Express middleware for JWT authentication, role verification, input validation, and centralized error handling.
- `controllers/` : Request handlers containing business logic (auth, products, categories, cart, orders, admin).
- `routes/` : Express REST API route definitions.
- `utils/` : Helper functions for currency conversion (paise to rupees), response formatting, and input sanitization.
- `app.js` : Express application configuration, middleware registration, and static file serving.
- `server.js` : Server entrypoint that boots the HTTP server on the configured port.
