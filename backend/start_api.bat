@echo off
REM Startup script for TensorFarm NDVI API

echo ===================================
echo TensorFarm NDVI API Startup
echo ===================================

REM Check if virtual environment exists
if not exist venv\Scripts\activate (
    echo Virtual environment not found. Creating...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo Failed to create virtual environment.
        exit /b %ERRORLEVEL%
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate
if %ERRORLEVEL% neq 0 (
    echo Failed to activate virtual environment.
    exit /b %ERRORLEVEL%
)

REM Install requirements
echo Installing requirements...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo Failed to install requirements.
    exit /b %ERRORLEVEL%
)

REM Run Earth Engine authentication test
echo Testing Earth Engine authentication...
echo ===================================
echo NOTE: If you have a Google Cloud project ID, you can specify it:
echo start_api.bat YOUR_PROJECT_ID
echo ===================================

SET PROJECT_ID=%1

if defined PROJECT_ID (
    echo Using Google Cloud project ID: %PROJECT_ID%
    python test_ee_new.py %PROJECT_ID%
) else (
    echo No project ID specified, using default...
    python test_ee_new.py
)

if %ERRORLEVEL% neq 0 (
    echo ===================================
    echo Earth Engine authentication test failed.
    echo ===================================
    echo TROUBLESHOOTING STEPS:
    echo 1. Run 'earthengine authenticate' in a new terminal window
    echo 2. Make sure you have a Google Cloud project with Earth Engine API enabled
    echo 3. Register for Earth Engine access at https://signup.earthengine.google.com/
    echo 4. Try running with your project ID: start_api.bat YOUR_PROJECT_ID
    echo.
    echo Do you want to continue starting the API server anyway? [Y/N]
    set /p continue_choice=
    if /i not "%continue_choice%"=="Y" exit /b 1
    echo Continuing with API startup despite authentication issues...
)

REM Start the API server
echo Starting the API server...
echo The API will be available at http://localhost:8000
uvicorn main:app --reload

REM Deactivate virtual environment when server stops
call deactivate
