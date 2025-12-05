const express = require('express');
const router = express.Router();
const dbManager = require('../utils/dbManager');

// 插入数据
router.post('/:connectionId/:database/:table/insert', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const data = req.body;
    const decodedDatabase = decodeURIComponent(database);
    const decodedTable = decodeURIComponent(table);

    const conn = dbManager.getConnection(connectionId);
    if (!conn) {
      return res.status(404).json({ error: '连接不存在' });
    }

    const result = await dbManager.insertRow(connectionId, decodedDatabase, decodedTable, data);
    res.json(result);
  } catch (error) {
    console.error('插入数据错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新数据
router.put('/:connectionId/:database/:table/update', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const { primaryKey, primaryValue, data } = req.body;
    const decodedDatabase = decodeURIComponent(database);
    const decodedTable = decodeURIComponent(table);

    const conn = dbManager.getConnection(connectionId);
    if (!conn) {
      return res.status(404).json({ error: '连接不存在' });
    }

    const result = await dbManager.updateRow(
      connectionId,
      decodedDatabase,
      decodedTable,
      primaryKey,
      primaryValue,
      data
    );
    res.json(result);
  } catch (error) {
    console.error('更新数据错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除数据
router.delete('/:connectionId/:database/:table/delete', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const { primaryKey, primaryValue } = req.body;
    const decodedDatabase = decodeURIComponent(database);
    const decodedTable = decodeURIComponent(table);

    const conn = dbManager.getConnection(connectionId);
    if (!conn) {
      return res.status(404).json({ error: '连接不存在' });
    }

    const result = await dbManager.deleteRow(
      connectionId,
      decodedDatabase,
      decodedTable,
      primaryKey,
      primaryValue
    );
    res.json(result);
  } catch (error) {
    console.error('删除数据错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

