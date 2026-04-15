@echo off
echo ========================================
echo Остановка мессенджера VOG Chat
echo ========================================
echo.

echo Останавливаю процессы Node.js...
taskkill /F /IM node.exe >nul 2>nul

if %errorlevel% equ 0 (
    echo Все процессы Node.js остановлены
) else (
    echo Не удалось найти запущенные процессы Node.js
)

echo.
echo Останавливаю командные окна...
taskkill /F /FI "WINDOWTITLE eq VOG Chat Server" >nul 2>nul
taskkill /F /FI "WINDOWTITLE eq VOG Chat Client" >nul 2>nul

echo.
echo ========================================
echo Приложение остановлено
echo ========================================
echo.
pause