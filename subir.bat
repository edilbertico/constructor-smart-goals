@echo off
echo ============================================
echo   Constructor SMART - Subir a GitHub
echo ============================================
echo.

cd /d "%~dp0"

echo [1/7] Configurando Git...
git config user.email "edilbertico@users.noreply.github.com"
git config user.name "edilbertico"
echo.

echo [2/7] Inicializando git...
git init 2>nul
echo.

echo [3/7] Agregando archivos...
git add .
echo.

echo [4/7] Guardando cambios...
git commit -m "Constructor de Objetivos SMART - version completa"
echo.

echo [5/7] Configurando rama principal...
git branch -M main
echo.

echo [6/7] Conectando con GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/edilbertico/constructor-smart-goals.git
echo.

echo [7/7] Subiendo a GitHub...
git push -u origin main --force
echo.

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   ERROR al subir. Posible causa:
    echo   Necesitas un token de GitHub.
    echo.
    echo   Crea uno aqui:
    echo   https://github.com/settings/tokens/new
    echo.
    echo   1. Note: constructor-smart
    echo   2. Expiration: 30 days
    echo   3. Marca: repo
    echo   4. Genera y copia el token
    echo.
    echo   Luego ejecuta este script de nuevo.
    echo   Cuando pida contrasena, pega el token.
    echo ============================================
) else (
    echo ============================================
    echo   EXITO! Tu codigo esta en GitHub:
    echo   https://github.com/edilbertico/constructor-smart-goals
    echo ============================================
)
echo.
pause