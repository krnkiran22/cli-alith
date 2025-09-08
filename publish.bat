@echo off
echo 🚀 Publishing create-alith-app to npm...

:: Check if logged into npm
npm whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ You're not logged into npm. Please run 'npm login' first.
    exit /b 1
)

for /f %%i in ('npm whoami') do set npm_user=%%i
echo 📋 Current npm user: %npm_user%

:: Test the package
echo 🔍 Testing package...
npm test

:: Check if package name is available
echo 🔍 Checking if package name is available...
npm view create-alith-app >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  Package 'create-alith-app' already exists. You may need to use a different name.
    echo Suggested alternatives:
    echo   - @your-username/create-alith-app
    echo   - create-alith-ai-app  
    echo   - create-alith-chat
    set /p continue="Continue anyway? (y/N): "
    if /i not "%continue%"=="y" exit /b 1
)

:: Publish to npm
echo 📦 Publishing to npm...
npm publish

if %errorlevel% equ 0 (
    echo ✅ Successfully published create-alith-app!
    echo.
    echo 🎉 Users can now create Alith apps with:
    echo    npx create-alith-app my-app
    echo.
    echo 🔗 View on npm: https://www.npmjs.com/package/create-alith-app
) else (
    echo ❌ Failed to publish package
    exit /b 1
)
