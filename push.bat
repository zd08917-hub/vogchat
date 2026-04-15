@echo off
chcp 65001 >nul
echo ========================================
echo        VOG Chat - Git Push Helper
echo ========================================
echo.

REM Проверка наличия git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Ошибка: Git не установлен или не добавлен в PATH.
    echo Установите Git с https://git-scm.com/
    pause
    exit /b 1
)

REM Проверка, что мы в git репозитории
git status >nul 2>nul
if %errorlevel% neq 0 (
    echo Ошибка: Текущая директория не является git репозиторием.
    pause
    exit /b 1
)

REM Показать текущий статус
echo Текущий статус репозитория:
echo ----------------------------------------
git status --short
echo ----------------------------------------
echo.

REM Запрос сообщения коммита
set /p commit_message="Введите сообщение коммита (или нажмите Enter для 'update'): "
if "%commit_message%"=="" set commit_message="update"

REM Подтверждение
echo.
echo Вы собираетесь выполнить:
echo   git add .
echo   git commit -m "%commit_message%"
echo   git push origin main
echo.
set /p confirm="Продолжить? (Y/N): "

if /i "%confirm%" neq "Y" (
    echo Отменено.
    pause
    exit /b 0
)

echo.
echo ========================================
echo Выполнение команд...
echo ========================================
echo.

REM Добавление всех изменений
echo 1. Добавление файлов (git add .)...
git add .
if %errorlevel% neq 0 (
    echo Ошибка при добавлении файлов.
    pause
    exit /b 1
)

REM Создание коммита
echo 2. Создание коммита...
git commit -m "%commit_message%"
if %errorlevel% neq 0 (
    echo Ошибка при создании коммита.
    echo Возможно, нет изменений для коммита.
    pause
    exit /b 1
)

REM Отправка на GitHub
echo 3. Отправка на GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo Ошибка при отправке на GitHub.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Успешно! Изменения отправлены на GitHub.
echo ========================================
echo.

REM Показать последний коммит
echo Последний коммит:
git log --oneline -1

echo.
pause