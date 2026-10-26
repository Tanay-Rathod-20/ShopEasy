# ShopEasy Internship Viva Preparation Guide & Defense Notes

This guide provides direct, confident, beginner-friendly answers to questions you are likely to be asked during your internship viva evaluation.

---

### Q1: Why did you choose Vanilla JavaScript instead of React or Vue?
**Answer:**
> "I chose Vanilla JavaScript (HTML5, CSS3, and modern ES6+) to deeply demonstrate a solid grasp of core web fundamentals: DOM manipulation, asynchronous programming with `async/await` and Fetch API, event delegation, and modular component architecture without abstracting behind framework magic. This ensures high page speed, zero client bundling overhead, and direct browser compatibility."

---

### Q2: Why did you choose SQLite and the `better-sqlite3` driver?
**Answer:**
> "SQLite is a serverless, zero-configuration, self-contained relational database that stores data in a single file (`shopeasy.db`). `better-sqlite3` is the fastest SQLite driver for Node.js. It operates synchronously, which eliminates async callback hell for database queries and enables straightforward, bulletproof atomic transactions via `db.transaction()`."

---

### Q3: Why are prices stored in integer paise instead of floating-point rupees?
**Answer:**
> "Standard JavaScript numbers use IEEE 754 64-bit floating point math. Floating points introduce calculation inaccuracies (such as `0.1 + 0.2 === 0.30000000000000004`). In e-commerce, rounding errors in currency calculations lead to legal and financial discrepancies. Storing prices safely in integer paise (e.g. ₹1,999.00 = `199900` paise) eliminates fractional math errors completely. Conversions only happen for user display using `Intl.NumberFormat('en-IN')`."

---

### Q4: How does your checkout handle database transactions? What happens if an error occurs mid-order?
**Answer:**
> "When a customer places an order, three separate database actions must occur simultaneously:
> 1. Insert the new order header in `orders`.
> 2. Insert line items in `order_items` AND decrement product stock in `products`.
> 3. Clear the customer's cart in `cart_items`.
> 
> We wrap all these operations inside `db.transaction(() => { ... })`. If any item fails stock validation or a query fails midway, SQLite automatically issues a complete `ROLLBACK`. No partial data is saved, stock is not deducted, and the cart is not cleared."

---

### Q5: How is user security and password storage handled?
**Answer:**
> "Passwords are never stored in plain text. When a user registers, we use `bcryptjs` with 10 salt rounds to generate an irreversible, salted cryptographic hash (`$2a$10$...`). When logging in, `bcrypt.compareSync` compares the provided plaintext password against the stored hash. Upon verification, the server issues a digitally signed JSON Web Token (JWT) containing `{ id, email, role }` signed with an environment secret (`JWT_SECRET`)."

---

### Q6: How do you prevent users from giving themselves admin privileges?
**Answer:**
> "On public registration (`POST /api/auth/register`), the role is hardcoded on the server to `'customer'`. We never trust any `role` sent in the request body. Furthermore, all admin endpoints (`/api/admin/*`) are protected by a two-tier middleware:
> 1. `authenticateToken`: Verifies the JWT signature and extracts user identity.
> 2. `requireAdmin`: Strictly checks `if (req.user.role !== 'admin') return res.status(403)`.
> Client-side manipulation of HTML or LocalStorage cannot bypass the server-side role check."

---

### Q7: How does the system prevent adding out-of-stock items or exceeding available inventory?
**Answer:**
> "Validation occurs both on the client and strictly on the server:
> - Client: Disables the 'Add to Cart' button and caps quantity selectors to available stock.
> - Server: In `cartController.js`, `addToCart` and `updateCartItem` execute parameterized SQL queries to check `stock_quantity`. If `(currentCartQty + requestedQty) > product.stock_quantity`, the API rejects the request with HTTP 400 Bad Request."

---

### Q8: How does the order tracking timeline work?
**Answer:**
> "The tracking stepper is derived strictly from the verified order status stored in SQLite (`Placed`, `Shipped`, `Delivered`, `Cancelled`). When an order is created, the system calculates estimated delivery and assigns a tracked waybill number. In the interface, these are explicitly labeled as simulated demo carrier data for transparency."

---

### Q9: How are SQL Injection and XSS attacks mitigated?
**Answer:**
> - **SQL Injection:** We use 100% parameterized SQL prepared statements via `db.prepare('... WHERE id = ?').run(id)`. Untrusted user input is always passed as query parameters, never concatenated into SQL strings.
> - **XSS (Cross-Site Scripting):** All dynamic text rendered into HTML templates passes through an `escapeHTML()` helper that sanitizes `<`, `>`, `&`, `"`, and `'` characters."

---

### Q10: What HTTP status codes are used in your REST APIs?
**Answer:**
> - `200 OK`: Successful retrieval or update.
> - `201 Created`: Successful resource creation (Registration, Order placed, Product created).
> - `400 Bad Request`: Input validation failed or inventory exceeded.
> - `401 Unauthorized`: Missing, expired, or invalid JWT token.
> - `403 Forbidden`: Authenticated user lacks administrator privileges.
> - `404 Not Found`: Resource (product, order, category) does not exist.
> - `500 Internal Server Error`: Caught by centralized error middleware without leaking stack traces.
