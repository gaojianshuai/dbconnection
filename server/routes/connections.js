const express = require('express');
const router = express.Router();
const dbManager = require('../utils/dbManager');
const fs = require('fs').promises;
const path = require('path');

const CONNECTIONS_FILE = path.join(__dirname, '../data/connections.json');

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = path.dirname(CONNECTIONS_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // 目录已存在
  }
}

// 读取连接配置
async function readConnections() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(CONNECTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 保存连接配置
async function saveConnections(connections) {
  await ensureDataDir();
  await fs.writeFile(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
}

// 检查连接状态
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = dbManager.getConnection(id);
    if (conn) {
      // 测试连接是否有效
      try {
        if (conn.type === 'mysql') {
          await conn.connection.query('SELECT 1');
        } else if (conn.type === 'postgresql') {
          await conn.connection.query('SELECT 1');
        } else if (conn.type === 'sqlite') {
          // SQLite连接总是有效的
        } else if (conn.type === 'mongodb') {
          await conn.connection.db().admin().ping();
        }
        res.json({ connected: true, connectionId: id });
      } catch (error) {
        // 连接已断开
        res.json({ connected: false, error: error.message });
      }
    } else {
      res.json({ connected: false, error: '连接不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取所有连接配置
router.get('/', async (req, res) => {
  try {
    const connections = await readConnections();
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新连接
router.post('/', async (req, res) => {
  try {
    const config = req.body;
    
    // 验证必需字段
    if (!config.name || !config.type) {
      return res.status(400).json({ error: '缺少必需字段: name, type' });
    }

    console.log('创建连接:', { name: config.name, type: config.type, host: config.host });

    // 测试连接
    const result = await dbManager.createConnection(config);
    const connectionId = result.connectionId;

    // 保存连接配置
    const connections = await readConnections();
    const newConnection = {
      id: connectionId,
      name: config.name,
      type: config.type,
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      path: config.path, // SQLite专用
      uri: config.uri, // MongoDB专用
      createdAt: new Date().toISOString(),
    };
    
    // 不保存密码到文件
    connections.push(newConnection);
    await saveConnections(connections);

    res.json({ ...newConnection, connectionId, success: true });
  } catch (error) {
    console.error('创建连接失败:', error);
    res.status(500).json({ error: error.message || '创建连接失败' });
  }
});

// 测试连接
router.post('/test', async (req, res) => {
  try {
    const config = req.body;
    
    // 基本验证
    if (!config.type) {
      return res.status(400).json({ error: '缺少数据库类型' });
    }

    console.log('测试连接:', { type: config.type, host: config.host, user: config.user });
    
    const result = await dbManager.createConnection(config);
    
    // 测试成功后关闭连接
    try {
      await dbManager.closeConnection(result.connectionId);
    } catch (closeError) {
      console.warn('关闭测试连接时出错:', closeError.message);
    }
    
    res.json({ success: true, message: '连接测试成功' });
  } catch (error) {
    console.error('连接测试失败:', error);
    res.status(500).json({ error: error.message || '连接测试失败' });
  }
});

// 删除连接
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 关闭活跃连接
    try {
      await dbManager.closeConnection(id);
    } catch (error) {
      // 连接可能已经关闭
    }

    // 从配置中删除
    const connections = await readConnections();
    const filtered = connections.filter(conn => conn.id !== id);
    await saveConnections(filtered);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 重新连接
router.post('/:id/connect', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const connections = await readConnections();
    const connection = connections.find(conn => conn.id === id);
    
    if (!connection) {
      return res.status(404).json({ error: '连接配置不存在' });
    }

    // 先关闭可能存在的旧连接
    try {
      await dbManager.closeConnection(id);
    } catch (error) {
      // 连接可能不存在，忽略错误
    }

    // 使用保存的配置和提供的密码创建连接
    const config = { ...connection, password, id: id }; // 确保使用相同的ID
    const result = await dbManager.createConnection(config);

    console.log(`连接成功: ${connection.name}, connectionId: ${result.connectionId}`);
    res.json({ success: true, connectionId: result.connectionId });
  } catch (error) {
    console.error('重新连接失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

