import os
import psycopg2
import bcrypt
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env no diretório backend
load_dotenv(dotenv_path='./backend/.env')

def clear_database():
    try:
        # Conexão com o banco de dados
        conn = psycopg2.connect(
            user=os.getenv('DB_USER'),
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            password=os.getenv('DB_PASSWORD'),
            port=os.getenv('DB_PORT')
        )
        conn.autocommit = False
        cur = conn.cursor()

        print("Limpando tabelas do banco de dados...")

        # Lista de tabelas para limpar (em ordem que respeite FKs ou usando CASCADE)
        tables = [
            'email_logs',
            'activity_log',
            'inventory_log',
            'payments',
            'service_orders',
            'extra_sales',
            'contracts',
            'extra_commissions',
            'reports',
            'bills_payable',
            'invoices',
            'sellers',
            'partners',
            'products',
            'clients',
            'users'
        ]

        # Truncar tabelas
        for table in tables:
            print(f"Limpando tabela: {table}")
            cur.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;")

        # Criar usuário administrador padrão
        print("Criando usuário administrador padrão (admin/admin)...")
        admin_name = "Administrador"
        admin_username = "admin"
        admin_password = "admin"
        password_hash = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        
        # Permissões padrão
        default_perms = '["clients", "products", "partners", "contracts", "sales", "inventory", "finance", "admin"]'

        cur.execute(
            "INSERT INTO users (name, username, password, role, permissions) VALUES (%s, %s, %s, %s, %s);",
            (admin_name, admin_username, password_hash, 'Administrador', default_perms)
        )

        conn.commit()
        print("\nSucesso! Banco de dados limpo e usuário 'admin' criado com a senha 'admin'.")

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        print(f"Erro ao limpar banco de dados: {e}")
    finally:
        if 'conn' in locals():
            cur.close()
            conn.close()

if __name__ == "__main__":
    confirm = input("AVISO: Isso apagará TODOS os dados do banco de dados. Digite 'SIM' para confirmar: ")
    if confirm.upper() == 'SIM':
        clear_database()
    else:
        print("Operação cancelada.")
