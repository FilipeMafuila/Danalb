@echo off
title DANALB – Backend SMTP
echo ======================================================
echo DANALB Angola – Backend SMTP
echo ======================================================
echo.
echo Instalando dependencias...
npm install
if %errorlevel% neq 0 (
  echo [ERRO] Falha ao instalar dependencias. Abortando.
  pause
  exit /b %errorlevel%
)

echo.
echo Iniciando o servidor...
npm start
pause
