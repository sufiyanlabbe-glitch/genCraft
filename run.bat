@echo off
title CreatorAI Studio
echo ========================================================
echo   Starting CreatorAI - AI-Powered Content Studio
echo ========================================================
echo.

set "PY_EXE=C:\Users\Sufiyan\AppData\Local\Python\pythoncore-3.14-64\python.exe"

if exist "%PY_EXE%" (
    "%PY_EXE%" app.py
) else (
    where py >nul 2>nul

        py app.py
    ) else (
        python app.py
    )
)

pause

