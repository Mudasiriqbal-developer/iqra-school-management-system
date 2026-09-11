@echo off
setlocal

set PROJECT_ROOT=D:\iqra-school-management-system
set NSSM=C:\nssm-2.24\win64\nssm.exe

echo ============================================
echo  IHASS Update and Restart
echo ============================================
echo.

echo Step 1: Pulling latest code...
cd /d "%PROJECT_ROOT%"
git pull
if errorlevel 1 (
    echo.
    echo [WARNING] git pull reported an issue. Check messages above.
    echo Continuing anyway in case this is a non-fatal warning...
    echo.
)

echo.
echo Step 2: Installing backend dependencies...
cd /d "%PROJECT_ROOT%\backend"
call npm install

echo.
echo Step 3: Installing frontend dependencies...
cd /d "%PROJECT_ROOT%\frontend"
call npm install

echo.
echo Step 4: Restarting services...
"%NSSM%" restart IHASS-Backend
"%NSSM%" restart IHASS-Frontend

echo.
echo Step 5: Checking status...
"%NSSM%" status IHASS-Backend
"%NSSM%" status IHASS-Frontend

echo.
echo ============================================
echo  Done. Open Chrome and hard-refresh
echo  (Ctrl+Shift+R) on localhost:5173 to see changes.
echo ============================================
echo.
pause
