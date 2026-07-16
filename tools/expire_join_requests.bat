@echo off
REM ============================================================================
REM  Master Golf Club - auto-expire stale join requests
REM  Runs the Django management command using the project's virtualenv.
REM  Schedule this with Windows Task Scheduler (see expire_join_requests_task.xml)
REM  to run every few minutes, e.g. every 5 minutes.
REM ============================================================================

REM Project root = parent of this tools\ folder
set "PROJECT_DIR=%~dp0.."
cd /d "%PROJECT_DIR%"

REM Prefer the venv python; fall back to system python if the venv is missing
set "PYTHON=%PROJECT_DIR%\venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"

"%PYTHON%" manage.py expire_join_requests >> "%PROJECT_DIR%\tools\expire_join_requests.log" 2>&1
