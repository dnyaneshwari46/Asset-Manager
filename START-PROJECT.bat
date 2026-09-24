@echo off
title Asset Manager - Starting...

echo Starting Asset Manager API...
start "Asset Manager API" powershell -NoExit -Command "$env:PORT='8080'; $env:DATABASE_URL='postgresql://postgres:123@localhost:5432/asset_manager'; $env:CLERK_SECRET_KEY='sk_test_nUqkC32YVbKGWabcyz4A3rwd5o4bHC4670Utsh6B9h'; cd '%~dp0'; pnpm.cmd --filter @workspace/api-server run start"

timeout /t 5 /nobreak >nul

echo Starting Asset Manager Frontend...
start "Asset Manager Frontend" powershell -NoExit -Command "cd '%~dp0artifacts\interview-ace'; $env:PORT='5173'; $env:BASE_PATH='/'; pnpm.cmd run dev"

timeout /t 8 /nobreak >nul

echo Opening Asset Manager...
start http://localhost:5173

echo.
echo Asset Manager started.
pause