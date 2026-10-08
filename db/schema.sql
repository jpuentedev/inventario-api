-- Esquema de la base de datos de inventario
CREATE DATABASE IF NOT EXISTS inventario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventario;

CREATE TABLE IF NOT EXISTS categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sku         VARCHAR(50)   NOT NULL UNIQUE,
  name        VARCHAR(150)  NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock       INT           NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(150),
  total         DECIMAL(12,2) NOT NULL,
  status        ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at  TIMESTAMP NULL
);

-- Se guarda el precio al momento de la venta para que cambios futuros no alteren órdenes pasadas
CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT           NOT NULL,
  product_id INT           NOT NULL,
  quantity   INT           NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal   DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Datos de ejemplo
INSERT IGNORE INTO categories (id, name) VALUES (1, 'Electrónica'), (2, 'Papelería');
INSERT IGNORE INTO products (sku, name, price, stock, category_id) VALUES
  ('ELEC-001', 'Mouse inalámbrico', 249.90, 30, 1),
  ('ELEC-002', 'Teclado mecánico', 899.00, 12, 1),
  ('PAP-001',  'Cuaderno profesional', 45.50, 100, 2);
