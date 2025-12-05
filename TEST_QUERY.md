# 查询编辑器测试指南

## 测试查询 jasper_platform 数据库中的表

### 方法1: 使用 SHOW TABLES（推荐）

1. **选择数据库**：在查询编辑器顶部的数据库下拉框中选择 `jasper_platform`
2. **输入SQL**：
   ```sql
   SHOW TABLES
   ```
3. **点击执行**：点击"执行"按钮
4. **查看结果**：应该能看到 jasper_platform 数据库中的所有表

### 方法2: 使用 information_schema（跨数据库查询）

1. **不需要选择数据库**（或选择任意数据库）
2. **输入SQL**：
   ```sql
   SELECT TABLE_NAME 
   FROM information_schema.TABLES 
   WHERE TABLE_SCHEMA = 'jasper_platform'
   ```
3. **点击执行**：点击"执行"按钮
4. **查看结果**：应该能看到 jasper_platform 数据库中的所有表名

### 方法3: 使用示例查询（快速测试）

1. **选择数据库**：在查询编辑器顶部的数据库下拉框中选择 `jasper_platform`
2. **选择示例**：点击"示例查询"下拉框，选择"查询所有表"
3. **自动填充**：SQL编辑器会自动填充 `SHOW TABLES` 语句
4. **点击执行**：点击"执行"按钮

### 方法4: 查询指定数据库的表（不切换数据库）

如果当前连接的不是 jasper_platform 数据库，可以使用：

```sql
SHOW TABLES FROM jasper_platform
```

或者：

```sql
SELECT TABLE_NAME 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'jasper_platform'
ORDER BY TABLE_NAME
```

## 测试步骤

1. **启动服务器**
   ```bash
   npm run dev
   ```

2. **打开浏览器**
   - 访问 http://localhost:5173
   - 点击顶部"SQL查询"标签

3. **连接数据库**
   - 在左侧连接列表中选择或创建 MySQL 连接
   - 输入密码并连接

4. **执行查询**
   - 选择数据库：`jasper_platform`（可选，如果使用 information_schema 则不需要）
   - 输入SQL：`SHOW TABLES` 或使用示例查询
   - 点击"执行"按钮

5. **验证结果**
   - 应该能看到表列表
   - 结果以表格形式显示
   - 显示记录数量

## 预期结果

执行 `SHOW TABLES` 后，应该返回类似以下的结果：

| Tables_in_jasper_platform |
|---------------------------|
| table1                    |
| table2                    |
| table3                    |

或者执行 `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'jasper_platform'` 后：

| TABLE_NAME |
|------------|
| table1     |
| table2     |
| table3     |

## 常见问题

### 问题1: 查询返回空结果
- **原因**：数据库选择不正确或数据库不存在
- **解决**：检查数据库名称是否正确，确保 jasper_platform 数据库存在

### 问题2: 查询执行失败
- **原因**：连接已断开或SQL语法错误
- **解决**：重新连接数据库，检查SQL语句是否正确

### 问题3: 权限不足
- **原因**：数据库用户没有查询权限
- **解决**：使用有权限的数据库用户连接

## 功能特性

✅ 支持 SHOW TABLES 查询
✅ 支持 information_schema 查询
✅ 支持数据库选择
✅ 支持示例查询快速填充
✅ 语法高亮显示
✅ 结果表格展示
✅ 错误提示

