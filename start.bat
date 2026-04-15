@echo off
echo ========================================
echo Запуск мессенджера VOG Chat
echo ========================================
echo.

REM Проверяем, установлен ли Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Ошибка: Node.js не установлен или не добавлен в PATH
    pause
    exit /b 1
)

REM Проверяем, установлен ли npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Ошибка: npm не установлен или не добавлен в PATH
    pause
    exit /b 1
)

echo 1. Проверка зависимостей...
cd /d "%~dp0"

REM Проверяем, установлены ли зависимости сервера
if not exist "server\node_modules\" (
    echo Установка зависимостей сервера...
    cd server
    npm install
    cd ..
) else (
    echo Зависимости сервера уже установлены
)

REM Проверяем, установлены ли зависимости фронтенда
if not exist "node_modules\" (
    echo Установка зависимостей фронтенда...
    npm install
) else (
    echo Зависимости фронтенда уже установлены
)

echo.
echo 2. Запуск сервера (бэкенд)...
start "VOG Chat Server" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo 3. Запуск клиента (фронтенд)...
start "VOG Chat Client" cmd /k "cd /d "%~dp0" && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Приложение запускается...
echo.
echo Сервер: http://localhost:3001
echo Клиент: http://localhost:5173
echo.
echo Регистрация: http://localhost:5173/registration
echo Вход: http://localhost:5173/login
echo.
echo Для остановки закройте оба окна командной строки
echo ========================================
echo.
pause