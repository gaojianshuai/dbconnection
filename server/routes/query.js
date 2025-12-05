const express = require('express');
const router = express.Router();
const dbManager = require('../utils/dbManager');

// 执行SQL查询
router.post('/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { query, database } = req.body;

    if (!query) {
      return res.status(400).json({ error: '查询语句不能为空' });
    }

    console.log(`执行查询: connectionId=${connectionId}, database=${database || '未指定'}`);
    console.log(`SQL: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);

    const result = await dbManager.executeQuery(connectionId, database, query);
    
    console.log(`查询成功: 返回 ${result.rows?.length || 0} 条记录`);
    res.json(result);
  } catch (error) {
    console.error('查询执行错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

