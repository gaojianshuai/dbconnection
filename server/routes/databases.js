const express = require('express');
const router = express.Router();
const dbManager = require('../utils/dbManager');

// 获取数据库列表
router.get('/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const databases = await dbManager.getDatabases(connectionId);
    res.json(databases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取表列表
router.get('/:connectionId/:database/tables', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    // URL解码数据库名，处理特殊字符
    const decodedDatabase = decodeURIComponent(database);
    const tables = await dbManager.getTables(connectionId, decodedDatabase);
    res.json(tables);
  } catch (error) {
    console.error('获取表列表错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取表结构
router.get('/:connectionId/:database/:table/structure', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    // URL解码数据库名和表名，处理特殊字符
    const decodedDatabase = decodeURIComponent(database);
    const decodedTable = decodeURIComponent(table);
    console.log(`获取表结构: connectionId=${connectionId}, database=${decodedDatabase}, table=${decodedTable}`);
    const structure = await dbManager.getTableStructure(connectionId, decodedDatabase, decodedTable);
    res.json(structure);
  } catch (error) {
    console.error('获取表结构错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取表数据（分页）
router.get('/:connectionId/:database/:table/data', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    // URL解码数据库名和表名，处理特殊字符
    const decodedDatabase = decodeURIComponent(database);
    const decodedTable = decodeURIComponent(table);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const conn = dbManager.getConnection(connectionId);
    if (!conn) {
      return res.status(404).json({ error: '连接不存在' });
    }

    let query;
    if (conn.type === 'mysql') {
      query = `SELECT * FROM \`${decodedDatabase}\`.\`${decodedTable}\` LIMIT ${limit} OFFSET ${offset}`;
    } else if (conn.type === 'postgresql') {
      query = `SELECT * FROM "${decodedTable}" LIMIT ${limit} OFFSET ${offset}`;
    } else if (conn.type === 'sqlite') {
      query = `SELECT * FROM ${decodedTable} LIMIT ${limit} OFFSET ${offset}`;
    } else {
      return res.status(400).json({ error: '不支持的数据库类型' });
    }

    const result = await dbManager.executeQuery(connectionId, decodedDatabase, query);
    res.json({
      data: result.rows,
      total: result.affectedRows,
      page,
      limit,
    });
  } catch (error) {
    console.error('获取表数据错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 修改表结构
router.post('/:connectionId/:database/:table/alter', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const changes = req.body;
    const decodedDatabase = decodeURIComponent(database);
    const decodedTable = decodeURIComponent(table);

    const conn = dbManager.getConnection(connectionId);
    if (!conn) {
      return res.status(404).json({ error: '连接不存在' });
    }

    const result = await dbManager.alterTable(connectionId, decodedDatabase, decodedTable, changes);
    res.json(result);
  } catch (error) {
    console.error('修改表结构错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取表DDL
router.get('/:connectionId/:database/:table/ddl', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const decodedDatabase = decodeURIComponent(database);
    const decodedTable = decodeURIComponent(table);

    const conn = dbManager.getConnection(connectionId);
    if (!conn) {
      return res.status(404).json({ error: '连接不存在' });
    }

    const ddl = await dbManager.getTableDDL(connectionId, decodedDatabase, decodedTable);
    res.json(ddl);
  } catch (error) {
    console.error('获取表DDL错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

