/**
 * 测试查询编辑器功能
 * 测试查询 jasper_platform 数据库中的表
 */

const mysql = require('mysql2/promise');

// 测试配置 - 请根据实际情况修改
const testConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '', // 请填写实际密码
  database: 'jasper_platform'
};

async function testQuery() {
  let connection;
  
  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(testConfig);
    console.log('数据库连接成功！\n');

    // 测试1: 使用 SHOW TABLES 查询表
    console.log('测试1: 查询 jasper_platform 数据库中的表 (SHOW TABLES)');
    console.log('执行SQL: SHOW TABLES');
    const [tables1] = await connection.query('SHOW TABLES');
    console.log('结果:', tables1);
    console.log('表数量:', tables1.length);
    console.log('');

    // 测试2: 使用 information_schema 查询表
    console.log('测试2: 使用 information_schema 查询表');
    const query2 = `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'jasper_platform'`;
    console.log('执行SQL:', query2);
    const [tables2] = await connection.query(query2);
    console.log('结果:', tables2);
    console.log('表数量:', tables2.length);
    console.log('');

    // 测试3: 使用 USE 语句后查询
    console.log('测试3: 使用 USE 语句后查询表');
    await connection.query('USE jasper_platform');
    const [tables3] = await connection.query('SHOW TABLES');
    console.log('结果:', tables3);
    console.log('表数量:', tables3.length);
    console.log('');

    // 测试4: 查询表结构
    if (tables1.length > 0) {
      const firstTable = Object.values(tables1[0])[0];
      console.log(`测试4: 查询表 ${firstTable} 的结构`);
      const [structure] = await connection.query(`DESCRIBE \`${firstTable}\``);
      console.log('表结构:', structure);
      console.log('');
    }

    // 测试5: 查询表数据
    if (tables1.length > 0) {
      const firstTable = Object.values(tables1[0])[0];
      console.log(`测试5: 查询表 ${firstTable} 的数据 (前5条)`);
      const [data] = await connection.query(`SELECT * FROM \`${firstTable}\` LIMIT 5`);
      console.log('数据:', data);
      console.log('数据条数:', data.length);
    }

    console.log('\n✅ 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('='.repeat(50));
  console.log('查询编辑器功能测试');
  console.log('测试查询 jasper_platform 数据库中的表');
  console.log('='.repeat(50));
  console.log('');
  
  if (!testConfig.password) {
    console.log('⚠️  警告: 请在 test_query.js 中设置数据库密码');
    console.log('或者通过环境变量设置: DB_PASSWORD=your_password node test_query.js');
    console.log('');
  }

  testQuery();
}

module.exports = { testQuery };

