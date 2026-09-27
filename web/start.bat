@echo off
rem 冲撞迷阵 Maze Dash - web port launcher (Windows)
setlocal
cd /d "%~dp0"
set PORT=8099

where node >nul 2>nul
if %errorlevel%==0 goto usenode

where python >nul 2>nul
if %errorlevel%==0 goto usepython

echo.
echo   Node.js or Python 3 is required to serve this game.
echo.
echo   Why a server? Browsers block the XHR requests the game uses to load
echo   its assets when a page is opened directly from disk (file:// URLs).
echo.
echo   Install Node.js from https://nodejs.org and run this file again,
echo   or install Python 3 from https://www.python.org/downloads/
echo.
pause
exit /b 1

:usenode
echo Starting the bundled server on port %PORT% ...
start "" "http://localhost:%PORT%/"
node serve.js %PORT%
goto done

:usepython
echo Node.js not found - falling back to Python's built-in server.
echo (Audio retry behaviour is slightly reduced with this fallback.)
start "" "http://localhost:%PORT%/"
python -m http.server %PORT%
goto done

:done
endlocal
