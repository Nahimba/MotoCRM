@echo off
:: Force UTF-8 encoding for emojis/symbols
chcp 65001 > nul
cls
color 06

echo ============================================
echo   M O T O   C R M   -   L A U N C H E R
echo ============================================
echo.

:: Step into the project folder
:: cd /d "C:\Users\zvict\Desktop\MotoCRM\Project\my-crm"
cd /d "%~dp0"

echo [1/3] 🛠  Staging parts...
git add .

:: Commit with a timestamp
set msg=Update %date% %time%
echo [2/3] 🏷  Labeling package: "%msg%"
git commit -m "%msg%"

echo [3/3] 🚀 Blasting off to GitHub...
git push origin main

echo.
echo --------------------------------------------
echo ✅ SUCCESS: Update sent to the terminal!
echo 🏁 Vercel is now building your changes.
echo --------------------------------------------
echo.
pause