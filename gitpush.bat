@echo off
chcp 65001 >nul

REM Быстрый пуш на GitHub с сообщением коммита
REM Использование: gitpush.bat "сообщение коммита"
REM Если сообщение не указано, используется "update"

setlocal

REM Получение сообщения коммита из аргументов
if "%~1"=="" (
    set "commit_message=update"
) else (
    set "commit_message=%~1"
)

echo ========================================
echo Быстрая отправка на GitHub
echo ========================================
echo Сообщение коммита: %commit_message%
echo.

REM Проверка git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Ошибка: Git не найден.
    pause
    exit /b 1
)

REM Выполнение команд
echo Добавление изменений...
git add .

echo Создание коммита...
git commit -m "%commit_message%"

if %errorlevel% neq 0 (
    echo Внимание: Не удалось создать коммит.
    echo Возможно, нет изменений или коммит отменен.
    echo Продолжаем отправку существующих коммитов...
)

echo Отправка на GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo Ошибка при отправке на GitHub.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Успешно! Изменения отправлены.
echo ========================================
echo.

REM Краткий статус
git status --short

endlocal
pause