@echo off
echo 正在启动数据库连接管理平台...
echo.

echo 检查依赖...
if not exist "node_modules" (
    echo 安装后端依赖...
    call npm install
)

if not exist "client\node_modules" (
    echo 安装前端依赖...
    cd client
    call npm install
    cd ..
)

echo.
echo 启动服务器...
echo 后端服务器: http://localhost:5000
echo 前端应用: http://localhost:5173
echo.
echo 按 Ctrl+C 停止服务器
echo.

call npm run dev

pause

