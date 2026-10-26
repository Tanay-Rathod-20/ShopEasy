-- ShopEasy Initial Seed Data
-- 4 Categories and 16 High-Quality Products

-- Categories
INSERT OR IGNORE INTO categories (id, name, slug, description) VALUES
(1, 'Electronics & Gadgets', 'electronics', 'Cutting-edge consumer tech, headphones, smart devices, and accessories.'),
(2, 'Fashion & Apparel', 'fashion', 'Trendy casuals, formal wear, footwear, and premium everyday essentials.'),
(3, 'Home & Living', 'home-living', 'Modern kitchen appliances, home decor, cookware, and ergonomics.'),
(4, 'Books & Stationery', 'books-stationery', 'Bestselling paperbacks, productivity journals, and executive pens.');

-- Products (Prices stored in integer paise: ₹1 = 100 paise)
-- Example: ₹1,999 = 199900 paise
INSERT OR IGNORE INTO products (id, category_id, name, slug, description, price_paise, stock_quantity, image_url, is_active) VALUES
-- Electronics
(1, 1, 'Aura ANC Wireless Headphones', 'aura-anc-wireless-headphones', 'Active noise cancelling wireless over-ear headphones with 40-hour battery life and spatial audio.', 499900, 25, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', 1),
(2, 1, 'Pulse Smart Fitness Band', 'pulse-smart-fitness-band', 'Water-resistant fitness tracker with AMOLED display, continuous heart rate monitor, and sleep tracking.', 249900, 40, 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=80', 1),
(3, 1, 'HyperCharge 65W GaN Fast Charger', 'hypercharge-65w-gan-charger', 'Ultra-compact Gallium Nitride 3-port charger compatible with laptops, phones, and tablets.', 149900, 50, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80', 1),
(4, 1, 'SoundWave Portable Bluetooth Speaker', 'soundwave-portable-speaker', 'IPX7 waterproof 20W rugged outdoor speaker with punchy bass and 16-hour playtime.', 299900, 18, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80', 1),

-- Fashion
(5, 2, 'Classic Oxford Cotton Shirt', 'classic-oxford-cotton-shirt', 'Pure combed cotton regular-fit button-down shirt designed for all-day breathability and elegance.', 129900, 35, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80', 1),
(6, 2, 'Urban Comfort Slim Denim Jeans', 'urban-comfort-slim-denim-jeans', 'Stretchable mid-rise indigo denim with reinforced stitching and timeless fade treatment.', 189900, 28, 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80', 1),
(7, 2, 'Strider Pro Lightweight Running Shoes', 'strider-pro-running-shoes', 'Breathable knit upper with responsive EVA cushioning for daily workouts and marathon sprints.', 329900, 20, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', 1),
(8, 2, 'Minimalist Leather Bi-Fold Wallet', 'minimalist-leather-bifold-wallet', 'Full-grain genuine leather slim wallet with RFID blocking technology and 8 card slots.', 89900, 60, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80', 1),

-- Home & Living
(9, 3, 'Barista Cold Brew & Drip Coffee Maker', 'barista-cold-brew-coffee-maker', 'Borosilicate glass French press with fine stainless steel mesh filter and heat-resistant silicone base.', 159900, 22, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80', 1),
(10, 3, 'Ceramic Minimalist Table Lamp', 'ceramic-minimalist-table-lamp', 'Warm ambient warm-white LED lamp with textured ceramic base and natural linen drum shade.', 219900, 15, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80', 1),
(11, 3, 'Insulated Stainless Steel Flask (750ml)', 'insulated-stainless-steel-flask', 'Double-wall vacuum insulated thermal water bottle keeping beverages cold 24h or hot 12h.', 79900, 45, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80', 1),
(12, 3, 'Aroma Ultrasonic Diffuser', 'aroma-ultrasonic-diffuser', 'Quiet 300ml essential oil ultrasonic diffuser with 7 ambient color lights and auto-shutoff.', 139900, 30, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80', 1),

-- Books & Stationery
(13, 4, 'Hardcover Executive Dotted Journal', 'hardcover-executive-dotted-journal', 'Premium 120gsm bleed-proof paper notebook with ribbon bookmark and elastic pen loop.', 49900, 75, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80', 1),
(14, 4, 'Ergonomic Matte Metal Rollerball Pen', 'matte-metal-rollerball-pen', 'Precision weighted aluminum barrel with silky Japanese 0.5mm black gel ink refills.', 34900, 80, 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80', 1),
(15, 4, 'Wooden Desk Organizer Stand', 'wooden-desk-organizer-stand', 'Natural walnut finish desk dock with phone holder, cable management, and stationery tray.', 119900, 25, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80', 1),
(16, 4, 'Adjustable Aluminium Book & Tablet Stand', 'adjustable-aluminium-book-stand', 'Multi-angle foldable reading stand engineered with heavy-duty alloy and page holders.', 129900, 19, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80', 1);
