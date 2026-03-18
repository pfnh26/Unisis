import psycopg2
import os
import json
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env no diretório backend
load_dotenv(dotenv_path='./backend/.env')

def set_admin():
    conn = None
    try:
        # Configurações de conexão
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432")
        )
        cur = conn.cursor()

        # Listar os usuários existentes
        print("\n--- Lista de Usuários ---")
        cur.execute("SELECT id, username, name, role FROM users ORDER BY id;")
        users = cur.fetchall()

        if not users:
            print("Nenhum usuário encontrado no banco de dados.")
            return

        for user in users:
            user_id = user[0]
            username = user[1]
            name = user[2]
            role = user[3]
            print(f"[{user_id}] {username} (Nome: {name} | Função: {role})")

        print("-------------------------\n")

        # Selecionar o usuário
        user_id_input = input("Digite o ID do usuário que deseja promover a Administrador: ")
        
        try:
            target_id = int(user_id_input)
        except ValueError:
            print("ID inválido.")
            return

        # Verificar se o usuário existe
        cur.execute("SELECT username, role FROM users WHERE id = %s;", (target_id,))
        target_user = cur.fetchone()

        if not target_user:
            print("Usuário não encontrado com este ID.")
            return

        print(f"\nSelecionado: {target_user[0]}")

        # Permissões completas de admin
        admin_perms = '["clients", "products", "partners", "contracts", "sales", "inventory", "finance", "admin"]'

        # Atualizar a tabela
        cur.execute(
            "UPDATE users SET role = 'Administrador', permissions = %s WHERE id = %s;",
            (admin_perms, target_id)
        )
        
        conn.commit()
        print(f"\nSucesso! O usuário '{target_user[0]}' agora é um Administrador com todas as permissões.")

        cur.close()
    except Exception as e:
        print(f"Erro ao atualizar usuário: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    set_admin()
