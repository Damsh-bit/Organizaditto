@echo off
REM Doble clic para abrir Organizaditto en http://localhost:3000
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias (solo la primera vez)...
  call npm install
)
echo Preparando la app...
call npm run build
start "" http://localhost:3000
call npm start
