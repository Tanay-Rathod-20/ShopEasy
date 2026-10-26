# 🛍️ ShopEasy - Full-Stack E-Commerce Web Application

ShopEasy is a production-grade, full-stack e-commerce web platform engineered with **Vanilla JavaScript (ES6+)**, **Node.js**, **Express.js**, and a normalized **SQLite** database. 

Built as an individual internship capstone project, it demonstrates clean architecture, RESTful API design, database transaction atomicity, secure JWT authentication, server-side stock enforcement, and a modern customer shopping experience without relying on frontend frameworks like React.

---

## 🚀 Key Highlights & Architectural Features

- **No Frontend Frameworks**: 100% vanilla HTML5, CSS3, and ES6+ JavaScript modules.
- **Normalized SQLite Schema**: 6 normalized tables (`users`, `categories`, `products`, `cart_items`, `orders`, `order_items`) with foreign key enforcement (`PRAGMA foreign_keys = ON`) and WAL mode.
- **Monetary Safety in Integer Paise**: Prices stored as integer paise (e.g. ₹1,999.00 = `199900` paise) to prevent floating-point rounding errors.
- **Transactional Checkout**: Atomic checkout transactions (`db.transaction`) ensuring orders, order line items, inventory deduction, and cart cleanup succeed or fail together.
- **JWT & bcrypt Security**: Passwords salted with 10 rounds of `bcryptjs`. Stateless token authentication with role-based access control (`customer` vs `admin`).
- **Live Order Tracking Stepper**: Visual milestone tracking timeline (`Placed` → `Shipped` → `Delivered`) derived strictly from database order status.
- **Multiple Payment Methods**: Cash on Delivery (COD), Instant UPI QR/VPA, Credit/Debit Card, and Net Banking simulation.
- **Admin Control Panel**: Protected dashboard with real-time sales KPIs, order status management, and complete product CRUD.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5 Semantic Elements, Modern Vanilla CSS3, Vanilla ES6+ JavaScript (Fetch API, Modules) |
| **Backend** | Node.js (v24+), Express.js (v5 REST API framework) |
| **Database** | SQLite3 via `better-sqlite3` (high-performance synchronous driver) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing |
| **Environment** | `dotenv` configuration management |
| **Design** | Modern CSS Variables, Responsive Grid & Flexbox (tested down to 360px mobile) |

---

## 📁 Project Directory Structure

```text
ShopEasy/
├── .env.example              # Environment variables template
├── .env                      # Local environment configuration (ignored by Git)
├── .gitignore                # Protects secrets, database files, and node_modules
├── package.json              # Project scripts and dependency tree
├── public/                   # Client-side static frontend (served by Express)
│   ├── css/
│   │   └── style.css         # Modern design tokens, layouts, and responsive styles
│   ├── js/
│   │   ├── api.js            # Centralized fetch wrapper with JWT Authorization header
│   │   ├── auth.js           # Client authentication state & navbar synchronization
│   │   └── cart.js           # Live cart manager & badge count updater
│   ├── images/               # High-resolution local product photography
│   ├── index.html            # Customer storefront homepage with catalogue & search
│   ├── product.html          # Individual product details with stock & quantity selector
│   ├── cart.html             # Shopping cart with line totals & grand total
│   ├── checkout.html         # Delivery form & payment method selection
│   ├── orders.html           # Customer order history & live tracking stepper
│   ├── login.html            # Tabbed Sign In & Registration forms
│   ├── admin.html            # Admin control panel (stats, product CRUD, orders)
│   └── diagnostics.html      # Developer system health & database check
├── server/                   # Backend Node.js & Express application
│   ├── config/               # Environment variables loader
│   ├── controllers/          # Business logic (auth, product, cart, order, admin)
│   ├── database/             # SQLite connection, schema.sql, seed.sql, init.js, migrate.js
│   ├── middleware/           # JWT auth check, requireAdmin check, validation, errorHandler
│   ├── routes/               # Express REST API routes
│   ├── utils/                # Monetary converters (paise <-> rupees) and helpers
│   ├── app.js                # Express app setup and middleware pipeline
│   └── server.js             # HTTP server entrypoint
├── tests/                    # Automated verification scripts
│   ├── verify-stage-fixes.js
│   └── verify-tracking-and-payments.js
└── docs/                     # Internship viva defense materials
    ├── ER_DIAGRAM.md         # Database ER diagram & relational design notes
    ├── postman_collection.json # Complete Postman API collection v2.1
    └── VIVA_PREPARATION.md   # Viva questions and answers
```

---

## ⚙️ Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- Git

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <your-repo-url>
cd ShopEasy
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Review `.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_here
JWT_EXPIRES_IN=7d
DB_PATH=./server/database/shopeasy.db
ADMIN_NAME=ShopEasy Admin
ADMIN_EMAIL=admin@shopeasy.com
ADMIN_PASSWORD=Admin@12345
```

### 4. Initialize Database & Seed Sample Products
Execute the database initialization script:
```bash
npm run db:init
```
This automatically creates all 6 SQLite tables, creates performance indexes, seeds 4 categories and 16 high-quality products, and securely hashes the administrator account using bcrypt.

### 5. Start Application Server
```bash
npm start
```
Or for auto-reloading development server:
```bash
npm run dev
```

Open your browser at:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🔐 Default Demo Accounts

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@shopeasy.com` | `Admin@12345` | Full access to [Admin Portal](/admin.html), KPI dashboard, product CRUD, order status updater. |
| **Customer** | *(Register any account)* | *(Min 6 chars)* | Storefront, product details, cart, checkout, order tracking. |

> **Note**: Public user registration (`POST /api/auth/register`) enforces `role = 'customer'` on the server. Admin privileges cannot be granted through registration.

---

## 📡 REST API Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | Health check & database verification | Public |
| `POST` | `/api/auth/register` | Register new customer account | Public |
| `POST` | `/api/auth/login` | Login with email & password, returns JWT | Public |
| `GET` | `/api/auth/me` | Fetch currently authenticated user | Bearer JWT |
| `GET` | `/api/categories` | List all product categories | Public |
| `GET` | `/api/products` | List products (with `search`, `category`, `page`, `limit`) | Public |
| `GET` | `/api/products/:id` | Fetch single product by ID or slug | Public |
| `GET` | `/api/cart` | View current user's cart with grand total | Bearer JWT |
| `POST` | `/api/cart` | Add product to cart with stock validation | Bearer JWT |
| `PUT` | `/api/cart/:id` | Update quantity of a cart item | Bearer JWT |
| `DELETE` | `/api/cart/:id` | Remove single item from cart | Bearer JWT |
| `DELETE` | `/api/cart` | Clear entire cart | Bearer JWT |
| `POST` | `/api/orders` | Place order (Atomic SQLite transaction) | Bearer JWT |
| `GET` | `/api/orders` | Customer order history with live tracking | Bearer JWT |
| `GET` | `/api/orders/:id` | Single order details & waybill status | Bearer JWT |
| `GET` | `/api/admin/stats` | Platform sales KPI summary | Admin JWT |
| `GET` | `/api/admin/orders` | View all platform orders | Admin JWT |
| `PATCH` | `/api/admin/orders/:id/status` | Update order status (`Shipped`, `Delivered`) | Admin JWT |
| `GET` | `/api/admin/products` | View all products (active + inactive) | Admin JWT |
| `POST` | `/api/admin/products` | Create new product in catalogue | Admin JWT |
| `PUT` | `/api/admin/products/:id` | Update product details or stock | Admin JWT |
| `DELETE` | `/api/admin/products/:id` | Soft delete/deactivate product | Admin JWT |
| `POST` | `/api/admin/categories` | Add new product category | Admin JWT |

---

## 🧪 Running Automated Tests

Run the integrated verification suites:
```bash
node tests/verify-stage-fixes.js
node tests/verify-tracking-and-payments.js
```

---

## 📄 License & Academic Attribution
Created for an Individual Full-Stack Web Development Internship Project. Open-source under the ISC License.
