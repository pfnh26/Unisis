import psycopg2
import os
from dotenv import load_dotenv

# Carregar variáveis do .env do backend
load_dotenv(dotenv_path='backend/.env')

def clear_payments():
    try:
        conn = psycopg2.connect(
            user=os.getenv('DB_USER'),
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            password=os.getenv('DB_PASSWORD'),
            port=os.getenv('DB_PORT')
        )
        cur = conn.cursor()
        
        print("Limpando confirmações de pagamento (tabela 'payments')...")
        cur.execute("DELETE FROM payments;")
        conn.commit()
        print("Tabela 'payments' limpa com sucesso!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erro ao limpar pagamentos: {e}")

if __name__ == "__main__":
    clear_payments()
