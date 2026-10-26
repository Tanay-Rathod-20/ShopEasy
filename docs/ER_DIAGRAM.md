# ShopEasy Database Entity Relationship (ER) Diagram

ShopEasy uses a fully normalized SQLite relational database schema enforcing foreign key constraints (`PRAGMA foreign_keys = ON;`) and WAL (Write-Ahead Logging) mode.

---

## 1. Visual Entity Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ CART_ITEMS : "has"
    CATEGORIES ||--o{ PRODUCTS : "contains"
    PRODUCTS ||--o{ CART_ITEMS : "stored in"
    ORDERS ||--|{ ORDER_ITEMS : "consists of"
    PRODUCTS ||--o{ ORDER_ITEMS : "referenced in"

    USERS {
        INTEGER id PK "AUTOINCREMENT"
        TEXT name "Customer / Admin Name"
        TEXT email "UNIQUE, COLLATE NOCASE"
        TEXT password_hash "bcrypt salt hash"
        TEXT role "CHECK ('customer', 'admin')"
        DATETIME created_at "DEFAULT CURRENT_TIMESTAMP"
        DATETIME updated_at "DEFAULT CURRENT_TIMESTAMP"
    }

    CATEGORIES {
        INTEGER id PK "AUTOINCREMENT"
        TEXT name "UNIQUE Category Name"
        TEXT slug "UNIQUE URL Slug"
        TEXT description "Category details"
        DATETIME created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    PRODUCTS {
        INTEGER id PK "AUTOINCREMENT"
        INTEGER category_id FK "REFERENCES categories(id)"
        TEXT name "Product Name"
        TEXT slug "UNIQUE URL Slug"
        TEXT description "Detailed specs"
        INTEGER price_paise "CHECK (price_paise >= 0) in paise"
        INTEGER stock_quantity "CHECK (stock_quantity >= 0)"
        TEXT image_url "Product image path or URL"
        INTEGER is_active "CHECK (0, 1) default 1"
        DATETIME created_at "DEFAULT CURRENT_TIMESTAMP"
        DATETIME updated_at "DEFAULT CURRENT_TIMESTAMP"
    }

    CART_ITEMS {
        INTEGER id PK "AUTOINCREMENT"
        INTEGER user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        INTEGER product_id FK "REFERENCES products(id) ON DELETE CASCADE"
        INTEGER quantity "CHECK (quantity > 0)"
        DATETIME created_at "DEFAULT CURRENT_TIMESTAMP"
        DATETIME updated_at "DEFAULT CURRENT_TIMESTAMP"
    }

    ORDERS {
        INTEGER id PK "AUTOINCREMENT"
        TEXT order_number "UNIQUE e.g. ORD-20261026-ABCD"
        INTEGER user_id FK "REFERENCES users(id)"
        INTEGER total_paise "CHECK (total_paise >= 0)"
        TEXT status "CHECK ('Placed', 'Shipped', 'Delivered', 'Cancelled')"
        TEXT payment_method "CHECK ('COD', 'UPI', 'CARD', 'NETBANKING')"
        TEXT customer_name "Delivery recipient name"
        TEXT customer_phone "Contact number"
        TEXT shipping_address "Street address"
        TEXT shipping_city "City"
        TEXT shipping_pincode "Postal PIN code"
        DATETIME created_at "DEFAULT CURRENT_TIMESTAMP"
        DATETIME updated_at "DEFAULT CURRENT_TIMESTAMP"
    }

    ORDER_ITEMS {
        INTEGER id PK "AUTOINCREMENT"
        INTEGER order_id FK "REFERENCES orders(id) ON DELETE CASCADE"
        INTEGER product_id FK "REFERENCES products(id) ON DELETE RESTRICT"
        TEXT product_name "Snapshot of name at purchase"
        INTEGER unit_price_paise "Snapshot of unit price at purchase"
        INTEGER quantity "CHECK (quantity > 0)"
        INTEGER subtotal_paise "Calculated subtotal (unit_price * qty)"
    }
```

---

## 2. Key Architectural Decisions for Viva Defense

### A. Monetary Representation in Integer Paise
* **Why?** JavaScript and standard floating-point numbers suffer from IEEE 754 precision issues (e.g., `0.1 + 0.2 === 0.30000000000000004`).
* **Solution:** All prices are stored as positive integers in **paise** (1 Rupee = 100 paise).
  - Example: `₹1,999.00` is stored as `199900`.
  - Conversions are strictly isolated to helper utilities (`toPaise`, `toRupees`, `formatINR`).

### B. Historical Accuracy in `order_items`
* When an order is placed, `order_items` stores:
  - `unit_price_paise`: The exact price paid at the time of purchase.
  - `product_name`: The product name at the time of purchase.
* **Why?** If an administrator changes a product price or renames it in the future, past customer invoices and receipts remain 100% accurate.

### C. Foreign Key Constraints & Cascading Rules
* `cart_items`: Configured with `ON DELETE CASCADE` so deleting a user or product automatically cleans up orphaned cart entries.
* `orders` & `order_items`: Configured with `ON DELETE RESTRICT` for products, preventing accidental deletion of products that are tied to existing financial order histories.
