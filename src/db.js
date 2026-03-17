'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const md5 = require('md5');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'shopworthy.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    category TEXT,
    stock_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    total REAL NOT NULL,
    shipping_address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// Seed data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  db.exec(`
    INSERT INTO users (username, email, password, role) VALUES
    ('admin', 'admin@shopworthy.com', '${md5('admin')}', 'admin'),
    ('customer1', 'alice@example.com', '${md5('password123')}', 'customer'),
    ('customer2', 'bob@example.com', '${md5('password123')}', 'customer');

    INSERT INTO products (name, description, price, category, stock_count, image_url) VALUES
    ('Wireless Headphones Pro', '<b>Premium sound quality</b> with noise cancellation. <i>Perfect for commuters.</i>', 149.99, 'Electronics', 47, '/images/1.svg'),
    ('Running Shoes X3', '<b>Lightweight design</b> with advanced cushioning technology.', 89.99, 'Footwear', 120, '/images/2.svg'),
    ('Organic Coffee Blend', 'Single-origin <em>Ethiopian Yirgacheffe</em>. Notes of blueberry and citrus.', 24.99, 'Food', 200, '/images/3.svg'),
    ('Yoga Mat Premium', 'Non-slip surface, <b>6mm thick</b>. Includes carrying strap.', 59.99, 'Sports', 85, '/images/4.svg'),
    ('Smart Water Bottle', 'Tracks hydration. <b>LED temperature display.</b> BPA-free.', 39.99, 'Sports', 60, '/images/5.svg'),
    ('Mechanical Keyboard', '<b>Cherry MX Brown switches.</b> RGB backlit. Detachable USB-C cable.', 129.99, 'Electronics', 30, '/images/6.svg'),
    ('Stainless Steel Pan Set', '3-piece set. <b>Oven-safe to 500°F.</b> Dishwasher safe.', 79.99, 'Kitchen', 45, '/images/7.svg'),
    ('Bamboo Desk Organizer', 'Eco-friendly. <b>6 compartments.</b> Natural bamboo finish.', 34.99, 'Office', 90, '/images/8.svg'),
    ('Protein Powder Vanilla', '<b>25g protein per serving.</b> No artificial sweeteners. Mixes clean.', 49.99, 'Food', 150, '/images/9.svg'),
    ('USB-C Hub 7-in-1', 'Compatible with MacBook and PC. <b>4K HDMI output.</b> 100W PD.', 44.99, 'Electronics', 75, '/images/10.svg');

    INSERT INTO orders (user_id, status, total, shipping_address, notes) VALUES
    (2, 'delivered', 149.99, '123 Main St, Springfield, IL 62701', 'Please leave at door'),
    (2, 'pending', 89.99, '123 Main St, Springfield, IL 62701', NULL),
    (3, 'shipped', 224.98, '456 Oak Ave, Portland, OR 97201', 'Gift wrap please');
  `);
}

module.exports = db;
