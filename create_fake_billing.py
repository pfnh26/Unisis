import psycopg2
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')

def create_fake_data():
    try:
        # Connect to the database
        conn = psycopg2.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME
        )
        cur = conn.cursor()

        print("Conectado ao banco de dados com sucesso!")

        # 1. Create a fictitious client
        client_name = "PHELIPE MATHEUS GOMES DUARTE MEDRADO DE OLIVEIRA"
        client_cpf = "70359736130"
        client_email = "pfn_10@hotmail.com"
        
        cur.execute(
            "INSERT INTO clients (name, cpf, email, address, phone) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (client_name, client_cpf, client_email, "Rua Fictícia, 123", "(11) 98888-7777")
        )
        client_id = cur.fetchone()[0]
        print(f"Cliente fictício criado com ID: {client_id}")

        # 2. Create a fictitious seller (if none exists)
        cur.execute("SELECT id, user_id FROM sellers LIMIT 1")
        seller = cur.fetchone()
        if not seller:
            # Need a user first
            cur.execute(
                "INSERT INTO users (name, username, password, role) VALUES (%s, %s, %s, %s) RETURNING id",
                ("Vendedor Teste", "vendedor_teste", "senha123", "Vendedor")
            )
            user_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO sellers (user_id, name, profit_percentage) VALUES (%s, %s, %s) RETURNING id",
                (user_id, "Vendedor Teste", 10.0)
            )
            seller_id = cur.fetchone()[0]
        else:
            seller_id = seller[0]

        # 3. Create a contract (billing base)
        # Start date 3 months ago to have some history
        start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        cur.execute(
            """INSERT INTO contracts 
               (client_id, seller_id, type, total_value, cost_value, duration_months, start_date, status, payment_day) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (client_id, seller_id, "Plano Enterprise", 550.00, 200.00, 12, start_date, "Ativo", 15)
        )
        contract_id = cur.fetchone()[0]
        print(f"Contrato criado com ID: {contract_id}")

        # 4. Insert some past payments and leave some overdue
        # Parcela 1 (Pago)
        cur.execute(
            "INSERT INTO payments (contract_id, amount, payment_date, description, due_date_ref) VALUES (%s, %s, %s, %s, %s)",
            (contract_id, 550.00, (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d'), "Parcela 1", (datetime.now() - timedelta(days=60)).strftime('%Y-%m-15'))
        )
        
        # Parcela 2 (Atrasada - Não paga)
        # Não inserimos nada na tabela payments para a Parcela 2, assim ela constará como aberta/atrasada.

        conn.commit()
        print("Dados fictícios gerados com sucesso!")
        
        cur.close()
        conn.close()

    except Exception as e:
        print(f"Erro ao gerar dados: {e}")

if __name__ == "__main__":
    create_fake_data()
