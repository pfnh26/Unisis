import psycopg2
import os
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

def setup_database():
    # Configurações de conexão (lendo do .env)
    db_config = {
        "dbname": os.getenv("DB_NAME", "UniSis"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "host": os.getenv("DB_HOST", "localhost"),
        "port": os.getenv("DB_PORT", "5432")
    }

    # Schema consolidado baseado na análise do sistema
    schema_sql = """
    -- 1. Users
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK (role IN ('Administrador', 'Operador', 'Vendedor')) NOT NULL,
        permissions JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Clients
    CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        cnpj TEXT,
        cpf TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        email TEXT,
        is_manual BOOLEAN DEFAULT FALSE,
        data JSONB DEFAULT '{}'::jsonb,
        last_billing_email_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Products
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        unit TEXT CHECK (unit IN ('Unidade', 'Bombonas', 'KG', 'PC')) NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        ncm TEXT,
        cfop TEXT,
        v_bc DECIMAL(10,2) DEFAULT 0,
        v_icms DECIMAL(10,2) DEFAULT 0,
        v_ipi DECIMAL(10,2) DEFAULT 0,
        v_pis DECIMAL(10,2) DEFAULT 0,
        v_cofins DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Sellers
    CREATE TABLE IF NOT EXISTS sellers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        profit_percentage DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Partners
    CREATE TABLE IF NOT EXISTS partners (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        address TEXT,
        cep TEXT,
        cnpj TEXT UNIQUE,
        data JSONB DEFAULT '{}'::jsonb,
        certificate_url TEXT,
        certificate_password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Contracts
    CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
        seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        total_value DECIMAL(10,2) NOT NULL,
        cost_value DECIMAL(10,2) DEFAULT 0,
        has_pump BOOLEAN DEFAULT FALSE,
        pump_quantity INTEGER DEFAULT 1,
        pump_value DECIMAL(10,2) DEFAULT 0,
        pump_delivery_address TEXT,
        duration_months INTEGER NOT NULL,
        start_date DATE DEFAULT CURRENT_DATE,
        status TEXT CHECK (status IN ('Pendente', 'Ativo', 'Cancelado', 'Finalizado')) DEFAULT 'Pendente',
        payment_day INTEGER DEFAULT 1,
        pdf_url TEXT,
        description TEXT,
        no_amortization BOOLEAN DEFAULT FALSE,
        offline_hash TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Extra Sales
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
        description TEXT,
        items JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Service Orders
    CREATE TABLE IF NOT EXISTS service_orders (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
        sale_id INTEGER REFERENCES extra_sales(id) ON DELETE CASCADE,
        seller_id INTEGER REFERENCES users(id),
        execution_date DATE,
        status TEXT DEFAULT 'Pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Inventory Log
    CREATE TABLE IF NOT EXISTS inventory_log (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        type TEXT CHECK (type IN ('Entrada', 'Saída')) NOT NULL,
        quantity INTEGER NOT NULL,
        reason TEXT,
        ncm TEXT,
        cfop TEXT,
        v_bc DECIMAL(10,2) DEFAULT 0,
        v_icms DECIMAL(10,2) DEFAULT 0,
        v_ipi DECIMAL(10,2) DEFAULT 0,
        v_pis DECIMAL(10,2) DEFAULT 0,
        v_cofins DECIMAL(10,2) DEFAULT 0,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Payments
    CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
        sale_id INTEGER REFERENCES extra_sales(id) ON DELETE CASCADE,
        amount DECIMAL(10,2),
        payment_date DATE DEFAULT CURRENT_DATE,
        due_date_ref DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. Activity Log
    CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. System Settings
    CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        smtp_email TEXT,
        smtp_password TEXT,
        smtp_host TEXT,
        smtp_port INTEGER DEFAULT 587,
        smtp_secure BOOLEAN DEFAULT FALSE,
        report_email TEXT,
        auto_billing_enabled BOOLEAN DEFAULT FALSE,
        auto_expiry_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Reports
    CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        client_id INTEGER REFERENCES clients(id),
        client_cnpj TEXT,
        contact_name TEXT,
        representative TEXT,
        visit_type TEXT,
        reason TEXT,
        sample_collection TEXT,
        comments TEXT,
        images JSONB DEFAULT '[]'::jsonb,
        sales_contact TEXT,
        client_signature TEXT,
        second_signature TEXT,
        report_type TEXT DEFAULT '01',
        equipment_items JSONB DEFAULT '[]'::jsonb,
        dosage_regulation TEXT,
        client_brand TEXT,
        client_model TEXT,
        client_serial TEXT,
        defect_found TEXT,
        service_performed TEXT,
        offline_hash TEXT UNIQUE,
        equipment_obs TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 14. Bills Payable
    CREATE TABLE IF NOT EXISTS bills_payable (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT,
        value DECIMAL(10,2) NOT NULL,
        due_date DATE NOT NULL,
        recurrence TEXT DEFAULT 'Nenhuma',
        status TEXT CHECK (status IN ('Pendente', 'Pago')) DEFAULT 'Pendente',
        barcode TEXT,
        numeric_code TEXT,
        invoice_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 15. Extra Commissions
    CREATE TABLE IF NOT EXISTS extra_commissions (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER REFERENCES sellers(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        type TEXT CHECK (type IN ('Comissão', 'Vale')) NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 16. Invoices
    CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER REFERENCES partners(id),
        access_key TEXT,
        description TEXT,
        total_value DECIMAL(10,2),
        date DATE,
        xml_url TEXT,
        pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 17. Email Logs
    CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient TEXT,
        subject TEXT,
        status TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Inicialização padrão
    INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    """

    conn = None
    try:
        print(f"Conectando ao banco de dados {db_config['dbname']} em {db_config['host']}...")
        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()
        
        print("Executando criação das tabelas...")
        cur.execute(schema_sql)
        
        conn.commit()
        print("Banco de dados configurado com sucesso!")
        
        cur.close()
    except Exception as e:
        print(f"Erro ao configurar banco de dados: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    setup_database()
