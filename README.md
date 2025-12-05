# 数据库连接管理平台

一个现代化的数据库连接管理平台，类似于Navicat，支持多种数据库类型，提供完整的数据库管理功能。

## 功能特性

- ✅ 多数据库支持：MySQL、PostgreSQL、SQLite、MongoDB
- ✅ 连接管理：添加、编辑、删除、测试数据库连接
- ✅ 数据库浏览：查看数据库列表、表列表、表结构
- ✅ SQL查询：执行SQL查询，查看结果
- ✅ 数据浏览：分页查看表数据
- ✅ 现代化UI：美观的用户界面设计
- ✅ 本地部署：可在本地运行使用

## 技术栈

### 后端
- Node.js + Express
- MySQL2 (MySQL支持)
- pg (PostgreSQL支持)
- sqlite3 (SQLite支持)
- mongodb (MongoDB支持)

### 前端
- React + Vite
- Ant Design (UI组件库)
- Monaco Editor (SQL编辑器)

## 安装和运行

### Windows用户

直接双击运行 `start.bat` 文件，脚本会自动：
1. 检查并安装依赖
2. 启动后端和前端服务器

### 手动安装

#### 1. 安装依赖

```bash
npm run install-all
```

或者分别安装：

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

#### 2. 启动开发服务器

```bash
npm run dev
```

这将同时启动：
- 后端服务器：http://localhost:5000
- 前端开发服务器：http://localhost:5173

在浏览器中访问 http://localhost:5173 即可使用

#### 3. 生产环境构建

```bash
npm run build
npm start
```

## 使用说明

1. **添加数据库连接**
   - 点击"新建连接"按钮
   - 选择数据库类型（MySQL/PostgreSQL/SQLite/MongoDB）
   - 填写连接信息（主机、端口、用户名、密码、数据库名）
   - 点击"测试连接"验证配置
   - 保存连接

2. **浏览数据库**
   - 在左侧连接列表中选择已保存的连接
   - 输入密码连接
   - 展开查看数据库列表
   - 展开数据库查看表列表
   - 点击表查看表结构和数据

3. **执行SQL查询**
   - 在SQL编辑器中输入SQL语句
   - 点击"执行"按钮
   - 查看查询结果

## 项目结构

```
db_connection/
├── server/              # 后端代码
│   ├── routes/         # API路由
│   ├── utils/          # 工具函数
│   └── data/           # 数据存储
├── client/             # 前端代码
│   ├── src/
│   │   ├── components/ # React组件
│   │   ├── pages/      # 页面
│   │   └── utils/      # 工具函数
│   └── public/         # 静态资源
└── package.json
```

## 注意事项

- 密码不会保存到本地文件，每次连接需要重新输入
- 连接信息保存在 `server/data/connections.json`
- 建议在生产环境中使用HTTPS和身份验证

## 许可证

MIT

