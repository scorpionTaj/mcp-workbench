@echo off
REM ============================================================================
REM MCP Workbench - Windows Deployment Script
REM Automated deployment for Windows environments
REM ============================================================================

setlocal enabledelayedexpansion

echo ============================================================================
echo          MCP Workbench - Production Deployment (Windows)
echo ============================================================================
echo.

REM Configuration
set COMPOSE_FILE=docker-compose.yml
set HEALTH_CHECK_RETRIES=10
set HEALTH_CHECK_INTERVAL=5

REM Check prerequisites
echo [INFO] Checking prerequisites...

if not exist ".env" (
    echo [ERROR] .env file not found! Copy .env.example and configure it.
    exit /b 1
)

if not exist "%COMPOSE_FILE%" (
    echo [ERROR] %COMPOSE_FILE% not found!
    exit /b 1
)

docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    exit /b 1
)

echo [SUCCESS] Prerequisites check passed
echo.

REM Create backup directory
echo [INFO] Creating backup directory...
if not exist "backups" mkdir backups

REM Backup database
echo [INFO] Creating database backup...
set BACKUP_FILE=backups\db_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

docker-compose -f %COMPOSE_FILE% ps | findstr "postgres" >nul 2>&1
if not errorlevel 1 (
    docker-compose -f %COMPOSE_FILE% exec -T postgres pg_dump -U mcpworkbench mcpworkbench > "%BACKUP_FILE%"
    echo [SUCCESS] Database backed up to %BACKUP_FILE%
) else (
    echo [WARNING] Database not running, skipping backup
)
echo.

REM Pull latest images
echo [INFO] Pulling latest images...
docker-compose -f %COMPOSE_FILE% pull
echo [SUCCESS] Images pulled successfully
echo.

REM Build and start containers
echo [INFO] Building and starting containers...
docker-compose -f %COMPOSE_FILE% up -d --build
echo.

REM Wait for services
echo [INFO] Waiting for services to start...
timeout /t 10 /nobreak >nul
echo.

REM Health check
echo [INFO] Performing health checks...
set /a retries=0

:health_check_loop
if %retries% geq %HEALTH_CHECK_RETRIES% goto health_check_failed

curl -f -s http://localhost:3000/api/health >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Application is healthy!
    goto health_check_passed
)

set /a retries+=1
echo [WARNING] Health check attempt %retries%/%HEALTH_CHECK_RETRIES% failed, retrying...
timeout /t %HEALTH_CHECK_INTERVAL% /nobreak >nul
goto health_check_loop

:health_check_failed
echo [ERROR] Health check failed after %HEALTH_CHECK_RETRIES% attempts
echo [ERROR] Deployment failed!
goto rollback

:health_check_passed
echo.

REM Show running containers
echo [INFO] Running containers:
docker-compose -f %COMPOSE_FILE% ps
echo.

echo ============================================================================
echo              Deployment Successful!
echo ============================================================================
echo.
echo Application is available at: http://localhost:3000
echo Health check: http://localhost:3000/api/health
echo.
goto :eof

:rollback
echo [ERROR] Rolling back deployment...
docker-compose -f %COMPOSE_FILE% down
echo [ERROR] Rollback completed. Please check logs for errors.
exit /b 1
