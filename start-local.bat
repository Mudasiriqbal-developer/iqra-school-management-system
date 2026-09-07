@echo off
TITLE Iqra School Management System - Local Launcher
COLOR 0A

echo ================================================================
echo        IQRA SCHOOL MANAGEMENT SYSTEM - LOCAL LAUNCHER
echo ================================================================
echo.
echo [1/3] Starting Iqra Backend API Server (Port 5000)...
start "Iqra Backend API Server (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"

echo [2/3] Starting Iqra Frontend Client (Port 5173)...
start "Iqra Frontend Client (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Opening School Management System in default browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ================================================================
echo  Servers are starting in separate terminal windows!
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo  Default Admin Login: admin@ihass.edu / admin123456
echo ================================================================
echo.
echo You can minimize this window. Closing the server windows will stop the system.
pause
