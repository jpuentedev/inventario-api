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

-- Datos de ejemplo
INSERT IGNORE INTO categories (id, name) VALUES (1, 'Electrónica'), (2, 'Papelería');
INSERT IGNORE INTO products (sku, name, price, stock, category_id) VALUES
  ('ELEC-001', 'Mouse inalámbrico', 249.90, 30, 1),
  ('ELEC-002', 'Teclado mecánico', 899.00, 12, 1),
  ('PAP-001',  'Cuaderno profesional', 45.50, 100, 2);
