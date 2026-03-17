# ============================================================
# UniSis - Deploy Script (Frontend + Backend)
# Uso: clique direito > "Executar com PowerShell"
#      OU: no terminal, execute: .\deploy.ps1
# ============================================================

$SERVER   = "nedskt@192.168.15.23"
$PASSWORD = "537901"
$KEYFILE  = ""  # deixe vazio se usar senha

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   UniSis - Deploy para Servidor      " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se sshpass está disponível (Linux/WSL) ou usa plink (Windows)
# Para Windows simples, usamos SSH com comandos concatenados

$REMOTE_CMD = @"
echo '--- [1/4] Copiando arquivos do backend...' &&
echo '--- [2/4] Rebuild do frontend...' &&
cd /var/www/unisis/frontend &&
npm run build &&
echo '--- [3/4] Reiniciando backend...' &&
pm2 restart unisis-backend &&
echo '--- [4/4] Deploy concluido!' &&
pm2 list
"@

Write-Host "Conectando ao servidor $SERVER..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Execute os seguintes comandos no terminal SSH:" -ForegroundColor Green
Write-Host ""
Write-Host "  # Rebuild do Frontend:" -ForegroundColor White
Write-Host "  cd /var/www/unisis/frontend && npm run build" -ForegroundColor Yellow
Write-Host ""
Write-Host "  # Restart do Backend (sem rebuild necessario):" -ForegroundColor White
Write-Host "  pm2 restart unisis-backend" -ForegroundColor Yellow
Write-Host ""
Write-Host "  # Ou faca tudo de uma vez:" -ForegroundColor White
Write-Host "  cd /var/www/unisis/frontend && npm run build && pm2 restart unisis-backend && pm2 list" -ForegroundColor Cyan
Write-Host ""

# Tenta executar via SSH automaticamente
Write-Host "Tentando executar automaticamente via SSH..." -ForegroundColor Yellow

$cmd = "cd /var/www/unisis/frontend && npm run build && pm2 restart unisis-backend && pm2 list"

ssh -o StrictHostKeyChecking=no $SERVER $cmd

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "   Deploy finalizado!                 " -ForegroundColor Green  
Write-Host "   Acesse: http://192.168.15.23       " -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
