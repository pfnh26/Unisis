const { Pool, types } = require('pg');
require('dotenv').config();

// Force DATE (OID 1082) to be returned as a string (YYYY-MM-DD)
// effectively avoiding timezone shifts when the server is in UTC.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK (role IN ('Administrador', 'Operador', 'Vendedor')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        cnpj TEXT,
        cpf TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        email TEXT,
        is_manual BOOLEAN DEFAULT FALSE,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        unit TEXT CHECK (unit IN ('Unidade', 'Bombonas', 'KG', 'PC')) NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sellers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        profit_percentage DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS partners (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        address TEXT,
        cep TEXT,
        cnpj TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
        seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        total_value DECIMAL(10,2) NOT NULL,
        cost_value DECIMAL(10,2) NOT NULL,
        has_pump BOOLEAN DEFAULT FALSE,
        pump_quantity INTEGER DEFAULT 1,
        pump_value DECIMAL(10,2) DEFAULT 0,
        pump_delivery_address TEXT,
        duration_months INTEGER NOT NULL,
        start_date DATE DEFAULT CURRENT_DATE,
        status TEXT CHECK (status IN ('Pendente', 'Ativo', 'Cancelado', 'Finalizado')) DEFAULT 'Pendente',
        payment_day INTEGER DEFAULT 1,
        pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS extra_sales (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
        partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,
        product_description TEXT,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        cost DECIMAL(10,2) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        execution_date DATE,
        status TEXT DEFAULT 'Pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS service_orders (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
        sale_id INTEGER REFERENCES extra_sales(id) ON DELETE CASCADE,
        seller_id INTEGER REFERENCES users(id),
        execution_date DATE,
        status TEXT DEFAULT 'Pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_log (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        type TEXT CHECK (type IN ('Entrada', 'Saída')) NOT NULL,
        quantity INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
        sale_id INTEGER REFERENCES extra_sales(id) ON DELETE CASCADE,
        amount DECIMAL(10,2),
        payment_date DATE DEFAULT CURRENT_DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        smtp_email TEXT,
        smtp_password TEXT,
        report_email TEXT,
        auto_billing_enabled BOOLEAN DEFAULT FALSE,
        auto_expiry_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO system_settings (id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = 1);
    `);

    // Migrations for existing tables
    const migrations = [
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pump_quantity INTEGER DEFAULT 1",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cost_value DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_day INTEGER DEFAULT 1",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pdf_url TEXT",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS sale_id INTEGER REFERENCES extra_sales(id) ON DELETE CASCADE",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS sale_id INTEGER REFERENCES extra_sales(id) ON DELETE CASCADE",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'",
      "ALTER TABLE partners ADD COLUMN IF NOT EXISTS data JSONB",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS data JSONB",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS no_amortization BOOLEAN DEFAULT FALSE",
      "ALTER TABLE extra_sales ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_date_ref DATE",
      "CREATE TABLE IF NOT EXISTS reports (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), client_id INTEGER REFERENCES clients(id), contact_name TEXT, representative TEXT, visit_type TEXT, reason TEXT, sample_collection TEXT, comments TEXT, images JSONB DEFAULT '[]', sales_contact TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "CREATE TABLE IF NOT EXISTS bills_payable (id SERIAL PRIMARY KEY, description TEXT NOT NULL, category TEXT, value DECIMAL(10,2) NOT NULL, due_date DATE NOT NULL, recurrence TEXT DEFAULT 'Nenhuma', status TEXT CHECK (status IN ('Pendente', 'Pago')) DEFAULT 'Pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_signature TEXT",
      "CREATE TABLE IF NOT EXISTS extra_commissions (id SERIAL PRIMARY KEY, seller_id INTEGER REFERENCES sellers(id) ON DELETE CASCADE, description TEXT NOT NULL, type TEXT CHECK (type IN ('Comissão', 'Vale')) NOT NULL, value DECIMAL(10,2) NOT NULL, date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "ALTER TABLE partners ADD COLUMN IF NOT EXISTS certificate_url TEXT",
      "ALTER TABLE partners ADD COLUMN IF NOT EXISTS certificate_password TEXT",
      "ALTER TABLE bills_payable ADD COLUMN IF NOT EXISTS barcode TEXT",
      "ALTER TABLE bills_payable ADD COLUMN IF NOT EXISTS numeric_code TEXT",
      "ALTER TABLE bills_payable ADD COLUMN IF NOT EXISTS invoice_id INTEGER",
      "CREATE TABLE IF NOT EXISTS invoices (id SERIAL PRIMARY KEY, partner_id INTEGER REFERENCES partners(id), access_key TEXT, description TEXT, total_value DECIMAL(10,2), date DATE, xml_url TEXT, pdf_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS ncm TEXT",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS cfop TEXT",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS v_bc DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS v_icms DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS v_ipi DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS v_pis DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS v_cofins DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS ncm TEXT",
      "ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS cfop TEXT",
      "ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS v_bc DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS v_icms DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS v_ipi DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS v_pis DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS v_cofins DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE extra_sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT '01'",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS equipment_items JSONB DEFAULT '[]'::jsonb",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS dosage_regulation TEXT",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_brand TEXT",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_model TEXT",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_serial TEXT",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS defect_found TEXT",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS service_performed TEXT",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS second_signature TEXT",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_cnpj TEXT",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS offline_hash TEXT UNIQUE",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS offline_hash TEXT UNIQUE",
      "ALTER TABLE reports ADD COLUMN IF NOT EXISTS equipment_obs TEXT",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_billing_email_at TIMESTAMP",
      "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS smtp_host TEXT",
      "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587",
      "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT FALSE",
      "CREATE TABLE IF NOT EXISTS email_logs (id SERIAL PRIMARY KEY, recipient TEXT, subject TEXT, status TEXT, error_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS first_invoice_date DATE"
    ];

    for (const sql of migrations) {
      try {
        await client.query(sql);
      } catch (err) {
        console.log(`Migration message: ${err.message} for command: ${sql}`);
      }
    }

    console.log("Database initialized and migrated successfully");
  } catch (err) {
    console.error("Error initializing database", err);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDb };
