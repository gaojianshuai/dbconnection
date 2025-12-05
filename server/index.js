const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectionRoutes = require('./routes/connections');
const databaseRoutes = require('./routes/databases');
const queryRoutes = require('./routes/query');
const tableDataRoutes = require('./routes/tableData');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 100次请求
});
app.use('/api/', limiter);

// 路由
app.use('/api/connections', connectionRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/databases', tableDataRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Database Connection Platform API' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

