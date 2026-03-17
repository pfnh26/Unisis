@echo off
echo Iniciando UniSis...
start cmd /k "npm run backend"
start cmd /k "npm run frontend"
echo Backend e Frontend estao sendo iniciados em novas janelas.
pause
