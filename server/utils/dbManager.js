const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');

// 存储活跃连接
const activeConnections = new Map();

class DatabaseManager {
  // 创建MySQL连接
  async createMySQLConnection(config) {
    const connectionId = config.id || `mysql_${Date.now()}`;
    try {
      // 验证必需字段
      if (!config.host || !config.user) {
        throw new Error('缺少必需字段: host, user');
      }

      const connectionConfig = {
        host: config.host,
        port: config.port || 3306,
        user: config.user,
        password: config.password || '',
        connectTimeout: 10000,
      };

      // database字段可选，如果提供则包含
      if (config.database) {
        connectionConfig.database = config.database;
      }

      const connection = await mysql.createConnection(connectionConfig);
      
      // 测试连接 - 使用query()而不是execute()，更通用
      await connection.query('SELECT 1');
      
      activeConnections.set(connectionId, {
        type: 'mysql',
        connection,
        config,
      });
      
      return { connectionId, success: true };
    } catch (error) {
      console.error('MySQL连接错误:', error);
      throw new Error(`MySQL连接失败: ${error.message}`);
    }
  }

  // 创建PostgreSQL连接
  async createPostgreSQLConnection(config) {
    const connectionId = config.id || `postgres_${Date.now()}`;
    try {
      // 验证必需字段
      if (!config.host || !config.user) {
        throw new Error('缺少必需字段: host, user');
      }

      const pool = new Pool({
        host: config.host,
        port: config.port || 5432,
        user: config.user,
        password: config.password || '',
        database: config.database || 'postgres', // 默认使用postgres数据库
        max: 5,
        connectionTimeoutMillis: 10000,
      });
      
      // 测试连接
      await pool.query('SELECT NOW()');
      
      activeConnections.set(connectionId, {
        type: 'postgresql',
        connection: pool,
        config,
      });
      
      return { connectionId, success: true };
    } catch (error) {
      console.error('PostgreSQL连接错误:', error);
      throw new Error(`PostgreSQL连接失败: ${error.message}`);
    }
  }

  // 创建SQLite连接
  async createSQLiteConnection(config) {
    const connectionId = config.id || `sqlite_${Date.now()}`;
    return new Promise((resolve, reject) => {
      // 验证必需字段
      if (!config.path && !config.database) {
        reject(new Error('缺少必需字段: path 或 database'));
        return;
      }

      const dbPath = config.path || config.database;
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('SQLite连接错误:', err);
          reject(new Error(`SQLite连接失败: ${err.message}`));
        } else {
          activeConnections.set(connectionId, {
            type: 'sqlite',
            connection: db,
            config,
          });
          resolve({ connectionId, success: true });
        }
      });
    });
  }

  // 创建MongoDB连接
  async createMongoDBConnection(config) {
    const connectionId = config.id || `mongodb_${Date.now()}`;
    try {
      let uri;
      if (config.uri) {
        uri = config.uri;
      } else {
        // 验证必需字段
        if (!config.host) {
          throw new Error('缺少必需字段: host');
        }
        
        // 构建MongoDB URI
        const auth = config.user && config.password 
          ? `${config.user}:${config.password}@` 
          : '';
        const db = config.database ? `/${config.database}` : '';
        uri = `mongodb://${auth}${config.host}:${config.port || 27017}${db}`;
      }

      const client = new MongoClient(uri, {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
      });
      
      await client.connect();
      
      // 测试连接
      await client.db().admin().ping();
      
      activeConnections.set(connectionId, {
        type: 'mongodb',
        connection: client,
        config,
      });
      
      return { connectionId, success: true };
    } catch (error) {
      console.error('MongoDB连接错误:', error);
      throw new Error(`MongoDB连接失败: ${error.message}`);
    }
  }

  // 通用连接方法
  async createConnection(config) {
    if (!config.type) {
      throw new Error('缺少数据库类型');
    }

    switch (config.type.toLowerCase()) {
      case 'mysql':
        return await this.createMySQLConnection(config);
      case 'postgresql':
      case 'postgres':
        return await this.createPostgreSQLConnection(config);
      case 'sqlite':
        return await this.createSQLiteConnection(config);
      case 'mongodb':
        return await this.createMongoDBConnection(config);
      default:
        throw new Error(`不支持的数据库类型: ${config.type}`);
    }
  }

  // 获取连接
  getConnection(connectionId) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      console.warn(`连接不存在: ${connectionId}, 当前活跃连接:`, Array.from(activeConnections.keys()));
    }
    return conn;
  }

  // 关闭连接
  async closeConnection(connectionId) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        await conn.connection.end();
      } else if (conn.type === 'postgresql') {
        await conn.connection.end();
      } else if (conn.type === 'sqlite') {
        conn.connection.close();
      } else if (conn.type === 'mongodb') {
        await conn.connection.close();
      }
      activeConnections.delete(connectionId);
      return { success: true };
    } catch (error) {
      throw new Error(`关闭连接失败: ${error.message}`);
    }
  }

  // 获取数据库列表
  async getDatabases(connectionId) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        // 使用query()而不是execute()，因为SHOW语句不支持预编译语句协议
        const [rows] = await conn.connection.query('SHOW DATABASES');
        return rows.map(row => row.Database || Object.values(row)[0]);
      } else if (conn.type === 'postgresql') {
        const result = await conn.connection.query(
          "SELECT datname FROM pg_database WHERE datistemplate = false"
        );
        return result.rows.map(row => row.datname);
      } else if (conn.type === 'sqlite') {
        return [conn.config.database || 'main'];
      } else if (conn.type === 'mongodb') {
        const adminDb = conn.connection.db().admin();
        const { databases } = await adminDb.listDatabases();
        return databases.map(db => db.name);
      }
    } catch (error) {
      throw new Error(`获取数据库列表失败: ${error.message}`);
    }
  }

  // 获取表列表
  async getTables(connectionId, database) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        // 先切换到指定数据库
        if (database) {
          try {
            await conn.connection.query(`USE \`${database}\``);
          } catch (useError) {
            console.error(`切换数据库失败: ${database}`, useError);
            throw new Error(`无法切换到数据库 '${database}': ${useError.message}`);
          }
        }
        // 使用query()而不是execute()，因为SHOW语句不支持预编译语句协议
        const [rows] = await conn.connection.query('SHOW TABLES');
        return rows.map(row => Object.values(row)[0]);
      } else if (conn.type === 'postgresql') {
        const result = await conn.connection.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );
        return result.rows.map(row => row.table_name);
      } else if (conn.type === 'sqlite') {
        return new Promise((resolve, reject) => {
          conn.connection.all(
            "SELECT name FROM sqlite_master WHERE type='table'",
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows.map(row => row.name));
            }
          );
        });
      } else if (conn.type === 'mongodb') {
        const db = conn.connection.db(database);
        const collections = await db.listCollections().toArray();
        return collections.map(col => col.name);
      }
    } catch (error) {
      throw new Error(`获取表列表失败: ${error.message}`);
    }
  }

  // 获取表结构
  async getTableStructure(connectionId, database, table) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        // 先切换到指定数据库（如果提供了数据库名）
        if (database) {
          try {
            await conn.connection.query(`USE \`${database}\``);
          } catch (useError) {
            console.error(`切换数据库失败: ${database}`, useError);
            throw new Error(`无法切换到数据库 '${database}': ${useError.message}`);
          }
        }
        // 使用query()而不是execute()，因为DESCRIBE语句不支持预编译语句协议
        const [rows] = await conn.connection.query(
          `DESCRIBE \`${table}\``
        );
        return rows.map(row => ({
          field: row.Field,
          type: row.Type,
          null: row.Null,
          key: row.Key,
          default: row.Default,
          extra: row.Extra,
        }));
      } else if (conn.type === 'postgresql') {
        const result = await conn.connection.query(
          `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1`,
          [table]
        );
        return result.rows.map(row => ({
          field: row.column_name,
          type: row.data_type,
          null: row.is_nullable,
          default: row.column_default,
        }));
      } else if (conn.type === 'sqlite') {
        return new Promise((resolve, reject) => {
          conn.connection.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) reject(err);
            else {
              resolve(rows.map(row => ({
                field: row.name,
                type: row.type,
                null: row.notnull === 0 ? 'YES' : 'NO',
                default: row.dflt_value,
                key: row.pk === 1 ? 'PRI' : '',
              })));
            }
          });
        });
      } else if (conn.type === 'mongodb') {
        const db = conn.connection.db(database);
        const collection = db.collection(table);
        const sample = await collection.findOne({});
        if (!sample) return [];
        
        return Object.keys(sample).map(key => ({
          field: key,
          type: typeof sample[key],
        }));
      }
    } catch (error) {
      throw new Error(`获取表结构失败: ${error.message}`);
    }
  }

  // 执行查询
  async executeQuery(connectionId, database, query) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        // 使用query()方法而不是execute()，因为某些SQL语句（如USE、SHOW等）不支持预编译语句协议
        if (database) {
          await conn.connection.query(`USE \`${database}\``);
        }
        
        // 执行查询 - 使用query()支持所有SQL语句类型（包括USE、SHOW等）
        const [rows, fields] = await conn.connection.query(query);
        
        // 判断是修改语句还是查询语句
        const queryUpper = query.trim().toUpperCase();
        const isModifyQuery = queryUpper.startsWith('INSERT') || 
                             queryUpper.startsWith('UPDATE') || 
                             queryUpper.startsWith('DELETE') ||
                             queryUpper.startsWith('CREATE') ||
                             queryUpper.startsWith('DROP') ||
                             queryUpper.startsWith('ALTER') ||
                             queryUpper.startsWith('TRUNCATE');
        
        if (isModifyQuery) {
          // 修改语句，rows是结果对象（OkPacket）
          const result = Array.isArray(rows) ? rows[0] : rows;
          return {
            rows: [],
            fields: [],
            affectedRows: result?.affectedRows || 0,
            insertId: result?.insertId,
            message: result?.message,
          };
        } else {
          // 查询语句（SELECT/SHOW/DESCRIBE等），rows是结果数组
          return {
            rows: Array.isArray(rows) ? rows : [],
            fields: fields ? fields.map(f => ({ name: f.name, type: f.type })) : [],
            affectedRows: Array.isArray(rows) ? rows.length : 0,
          };
        }
      } else if (conn.type === 'postgresql') {
        const result = await conn.connection.query(query);
        return {
          rows: result.rows,
          fields: result.fields ? result.fields.map(f => ({ name: f.name, type: f.type })) : [],
          affectedRows: result.rowCount || 0,
        };
      } else if (conn.type === 'sqlite') {
        return new Promise((resolve, reject) => {
          if (query.trim().toUpperCase().startsWith('SELECT')) {
            conn.connection.all(query, (err, rows) => {
              if (err) reject(err);
              else resolve({ rows, fields: [], affectedRows: rows.length });
            });
          } else {
            conn.connection.run(query, function(err) {
              if (err) reject(err);
              else resolve({ rows: [], fields: [], affectedRows: this.changes });
            });
          }
        });
      } else if (conn.type === 'mongodb') {
        // MongoDB需要特殊处理，这里简化处理
        throw new Error('MongoDB查询需要使用专门的MongoDB查询语法');
      }
    } catch (error) {
      throw new Error(`查询执行失败: ${error.message}`);
    }
  }

  // 插入数据
  async insertRow(connectionId, database, table, data) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        if (database) {
          await conn.connection.query(`USE \`${database}\``);
        }

        // 过滤掉空值（null/undefined/空字符串）的字段，除非字段允许NULL
        const filteredData = {};
        Object.keys(data).forEach(key => {
          const value = data[key];
          // 保留所有字段，让数据库处理默认值
          if (value !== undefined) {
            filteredData[key] = value;
          }
        });

        if (Object.keys(filteredData).length === 0) {
          throw new Error('没有可插入的数据');
        }

        const fields = Object.keys(filteredData).map(f => `\`${f}\``).join(', ');
        const values = Object.values(filteredData).map(v => {
          if (v === null || v === undefined || v === '') {
            return 'NULL';
          }
          if (typeof v === 'string') {
            // MySQL字符串转义：单引号转义为两个单引号，反斜杠转义为两个反斜杠
            const escaped = v.replace(/\\/g, '\\\\').replace(/'/g, "''");
            return `'${escaped}'`;
          }
          if (typeof v === 'boolean') {
            return v ? 1 : 0;
          }
          if (v instanceof Date) {
            return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          }
          return v;
        }).join(', ');

        const query = `INSERT INTO \`${table}\` (${fields}) VALUES (${values})`;
        const [result] = await conn.connection.query(query);

        return {
          success: true,
          insertId: result.insertId,
          affectedRows: result.affectedRows,
        };
      } else if (conn.type === 'postgresql') {
        // 过滤空值
        const filteredData = {};
        Object.keys(data).forEach(key => {
          const value = data[key];
          if (value !== undefined) {
            filteredData[key] = value === '' ? null : value;
          }
        });

        if (Object.keys(filteredData).length === 0) {
          throw new Error('没有可插入的数据');
        }

        const fields = Object.keys(filteredData);
        const values = Object.values(filteredData).map(v => {
          if (v instanceof Date) {
            return v.toISOString();
          }
          return v;
        });
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO "${table}" (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
        const result = await conn.connection.query(query, values);

        return {
          success: true,
          affectedRows: result.rowCount || 0,
        };
      } else if (conn.type === 'sqlite') {
        return new Promise((resolve, reject) => {
          const fields = Object.keys(data);
          const values = Object.values(data);
          const placeholders = values.map(() => '?').join(', ');

          const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
          conn.connection.run(query, values, function(err) {
            if (err) reject(err);
            else {
              resolve({
                success: true,
                insertId: this.lastID,
                affectedRows: this.changes,
              });
            }
          });
        });
      } else {
        throw new Error('不支持的数据库类型');
      }
    } catch (error) {
      throw new Error(`插入数据失败: ${error.message}`);
    }
  }

  // 更新数据
  async updateRow(connectionId, database, table, primaryKey, primaryValue, data) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        if (database) {
          await conn.connection.query(`USE \`${database}\``);
        }

        const setClause = Object.keys(data)
          .filter(key => key !== primaryKey)
          .map(key => {
            const value = data[key];
            if (value === null || value === undefined) {
              return `\`${key}\` = NULL`;
            }
            if (typeof value === 'string') {
              return `\`${key}\` = '${value.replace(/'/g, "''")}'`;
            }
            return `\`${key}\` = ${value}`;
          })
          .join(', ');

        if (!setClause) {
          throw new Error('没有要更新的字段');
        }

        const primaryValueEscaped = typeof primaryValue === 'string'
          ? `'${primaryValue.replace(/'/g, "''")}'`
          : primaryValue;

        const query = `UPDATE \`${table}\` SET ${setClause} WHERE \`${primaryKey}\` = ${primaryValueEscaped}`;
        const [result] = await conn.connection.query(query);

        return {
          success: true,
          affectedRows: result.affectedRows,
        };
      } else if (conn.type === 'postgresql') {
        const setClause = Object.keys(data)
          .filter(key => key !== primaryKey)
          .map((key, index) => `"${key}" = $${index + 1}`)
          .join(', ');

        if (!setClause) {
          throw new Error('没有要更新的字段');
        }

        const values = Object.values(data).filter((_, index) => {
          const keys = Object.keys(data);
          return keys[index] !== primaryKey;
        });
        values.push(primaryValue);

        const query = `UPDATE "${table}" SET ${setClause} WHERE "${primaryKey}" = $${values.length}`;
        const result = await conn.connection.query(query, values);

        return {
          success: true,
          affectedRows: result.rowCount || 0,
        };
      } else if (conn.type === 'sqlite') {
        return new Promise((resolve, reject) => {
          const setClause = Object.keys(data)
            .filter(key => key !== primaryKey)
            .map((key, index) => `${key} = ?`)
            .join(', ');

          if (!setClause) {
            reject(new Error('没有要更新的字段'));
            return;
          }

          const values = Object.values(data).filter((_, index) => {
            const keys = Object.keys(data);
            return keys[index] !== primaryKey;
          });
          values.push(primaryValue);

          const query = `UPDATE ${table} SET ${setClause} WHERE ${primaryKey} = ?`;
          conn.connection.run(query, values, function(err) {
            if (err) reject(err);
            else {
              resolve({
                success: true,
                affectedRows: this.changes,
              });
            }
          });
        });
      } else {
        throw new Error('不支持的数据库类型');
      }
    } catch (error) {
      throw new Error(`更新数据失败: ${error.message}`);
    }
  }

  // 删除数据
  async deleteRow(connectionId, database, table, primaryKey, primaryValue) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        if (database) {
          await conn.connection.query(`USE \`${database}\``);
        }

        const primaryValueEscaped = typeof primaryValue === 'string'
          ? `'${primaryValue.replace(/'/g, "''")}'`
          : primaryValue;

        const query = `DELETE FROM \`${table}\` WHERE \`${primaryKey}\` = ${primaryValueEscaped}`;
        const [result] = await conn.connection.query(query);

        return {
          success: true,
          affectedRows: result.affectedRows,
        };
      } else if (conn.type === 'postgresql') {
        const query = `DELETE FROM "${table}" WHERE "${primaryKey}" = $1`;
        const result = await conn.connection.query(query, [primaryValue]);

        return {
          success: true,
          affectedRows: result.rowCount || 0,
        };
      } else if (conn.type === 'sqlite') {
        return new Promise((resolve, reject) => {
          const query = `DELETE FROM ${table} WHERE ${primaryKey} = ?`;
          conn.connection.run(query, [primaryValue], function(err) {
            if (err) reject(err);
            else {
              resolve({
                success: true,
                affectedRows: this.changes,
              });
            }
          });
        });
      } else {
        throw new Error('不支持的数据库类型');
      }
    } catch (error) {
      throw new Error(`删除数据失败: ${error.message}`);
    }
  }

  // 修改表结构
  async alterTable(connectionId, database, table, changes) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        if (database) {
          await conn.connection.query(`USE \`${database}\``);
        }

        let query = '';
        const { action, field, newField, type, null: allowNull, default: defaultValue, extra, position, afterField } = changes;

        if (action === 'ADD') {
          // 添加字段
          let columnDef = `\`${field}\` ${type}`;
          if (allowNull === 'NO') {
            columnDef += ' NOT NULL';
          }
          if (defaultValue !== null && defaultValue !== undefined && defaultValue !== '') {
            const defaultVal = typeof defaultValue === 'string' 
              ? `'${defaultValue.replace(/'/g, "''")}'` 
              : defaultValue;
            columnDef += ` DEFAULT ${defaultVal}`;
          }
          if (extra) {
            columnDef += ` ${extra}`;
          }

          if (position === 'FIRST') {
            query = `ALTER TABLE \`${table}\` ADD COLUMN ${columnDef} FIRST`;
          } else if (position === 'AFTER' && afterField) {
            query = `ALTER TABLE \`${table}\` ADD COLUMN ${columnDef} AFTER \`${afterField}\``;
          } else {
            query = `ALTER TABLE \`${table}\` ADD COLUMN ${columnDef}`;
          }
        } else if (action === 'MODIFY') {
          // 修改字段
          let columnDef = `\`${newField || field}\` ${type}`;
          if (allowNull === 'NO') {
            columnDef += ' NOT NULL';
          }
          if (defaultValue !== null && defaultValue !== undefined && defaultValue !== '') {
            const defaultVal = typeof defaultValue === 'string' 
              ? `'${defaultValue.replace(/'/g, "''")}'` 
              : defaultValue;
            columnDef += ` DEFAULT ${defaultVal}`;
          } else if (defaultValue === null) {
            columnDef += ' DEFAULT NULL';
          }
          if (extra) {
            columnDef += ` ${extra}`;
          }

          query = `ALTER TABLE \`${table}\` MODIFY COLUMN ${columnDef}`;
        } else if (action === 'DROP') {
          // 删除字段
          query = `ALTER TABLE \`${table}\` DROP COLUMN \`${field}\``;
        } else {
          throw new Error('不支持的操作类型');
        }

        const [result] = await conn.connection.query(query);
        return {
          success: true,
          affectedRows: result.affectedRows || 0,
        };
      } else if (conn.type === 'postgresql') {
        if (database) {
          await conn.connection.query(`SET search_path TO "${database}"`);
        }

        let query = '';
        const { action, field, newField, type, null: allowNull, default: defaultValue, extra, position, afterField } = changes;

        if (action === 'ADD') {
          let columnDef = `"${field}" ${type}`;
          if (allowNull === 'NO') {
            columnDef += ' NOT NULL';
          }
          if (defaultValue !== null && defaultValue !== undefined && defaultValue !== '') {
            columnDef += ` DEFAULT '${defaultValue.replace(/'/g, "''")}'`;
          }

          query = `ALTER TABLE "${table}" ADD COLUMN ${columnDef}`;
        } else if (action === 'MODIFY') {
          // PostgreSQL使用ALTER COLUMN
          let modifications = [];
          if (newField && newField !== field) {
            modifications.push(`RENAME COLUMN "${field}" TO "${newField}"`);
          }
          if (type) {
            modifications.push(`ALTER COLUMN "${newField || field}" TYPE ${type}`);
          }
          if (allowNull === 'NO') {
            modifications.push(`ALTER COLUMN "${newField || field}" SET NOT NULL`);
          } else {
            modifications.push(`ALTER COLUMN "${newField || field}" DROP NOT NULL`);
          }
          if (defaultValue !== null && defaultValue !== undefined && defaultValue !== '') {
            modifications.push(`ALTER COLUMN "${newField || field}" SET DEFAULT '${defaultValue.replace(/'/g, "''")}'`);
          } else {
            modifications.push(`ALTER COLUMN "${newField || field}" DROP DEFAULT`);
          }

          if (modifications.length === 0) {
            throw new Error('没有要修改的内容');
          }
          query = `ALTER TABLE "${table}" ${modifications.join(', ')}`;
        } else if (action === 'DROP') {
          query = `ALTER TABLE "${table}" DROP COLUMN "${field}"`;
        } else {
          throw new Error('不支持的操作类型');
        }

        const result = await conn.connection.query(query);
        return {
          success: true,
          affectedRows: result.rowCount || 0,
        };
      } else if (conn.type === 'sqlite') {
        // SQLite的ALTER TABLE支持有限，只能重命名表和添加列
        const { action, field, type, null: allowNull, default: defaultValue } = changes;
        
        if (action === 'ADD') {
          let columnDef = `${field} ${type}`;
          if (allowNull === 'NO') {
            columnDef += ' NOT NULL';
          }
          if (defaultValue !== null && defaultValue !== undefined && defaultValue !== '') {
            columnDef += ` DEFAULT '${defaultValue.replace(/'/g, "''")}'`;
          }

          const query = `ALTER TABLE ${table} ADD COLUMN ${columnDef}`;
          return new Promise((resolve, reject) => {
            conn.connection.run(query, (err) => {
              if (err) reject(err);
              else resolve({ success: true, affectedRows: 0 });
            });
          });
        } else {
          throw new Error('SQLite只支持添加列操作，不支持修改和删除列');
        }
      } else {
        throw new Error('不支持的数据库类型');
      }
    } catch (error) {
      throw new Error(`修改表结构失败: ${error.message}`);
    }
  }

  // 获取表DDL
  async getTableDDL(connectionId, database, table) {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      throw new Error('连接不存在');
    }

    try {
      if (conn.type === 'mysql') {
        if (database) {
          await conn.connection.query(`USE \`${database}\``);
        }

        // 获取CREATE TABLE语句
        const [rows] = await conn.connection.query(`SHOW CREATE TABLE \`${table}\``);
        if (rows && rows.length > 0) {
          return rows[0]['Create Table'] || rows[0]['CREATE TABLE'];
        }
        throw new Error('无法获取表DDL');
      } else if (conn.type === 'postgresql') {
        // PostgreSQL构建CREATE TABLE语句
        const columnsResult = await conn.connection.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [table]);

        if (!columnsResult.rows || columnsResult.rows.length === 0) {
          throw new Error('表不存在或无法获取列信息');
        }

        // 获取主键信息
        const pkResult = await conn.connection.query(`
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary
        `, [table]);

        const primaryKeys = pkResult.rows.map(row => row.attname);

        // 构建DDL
        let ddl = `CREATE TABLE "${table}" (\n`;
        const columnDefs = columnsResult.rows.map(col => {
          let def = `  "${col.column_name}" `;
          
          // 数据类型
          if (col.data_type === 'character varying') {
            def += `VARCHAR(${col.character_maximum_length})`;
          } else if (col.data_type === 'character') {
            def += `CHAR(${col.character_maximum_length})`;
          } else if (col.data_type === 'numeric' || col.data_type === 'decimal') {
            def += `NUMERIC(${col.numeric_precision}, ${col.numeric_scale})`;
          } else {
            def += col.data_type.toUpperCase();
          }

          // NOT NULL
          if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
          }

          // DEFAULT
          if (col.column_default) {
            def += ` DEFAULT ${col.column_default}`;
          }

          return def;
        });

        ddl += columnDefs.join(',\n');

        // 添加主键约束
        if (primaryKeys.length > 0) {
          ddl += `,\n  PRIMARY KEY ("${primaryKeys.join('", "')}")`;
        }

        ddl += '\n);';

        return ddl;
      } else if (conn.type === 'sqlite') {
        return new Promise((resolve, reject) => {
          conn.connection.all(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, rows) => {
            if (err) {
              reject(err);
            } else if (rows && rows.length > 0) {
              resolve(rows[0].sql || '');
            } else {
              reject(new Error('无法获取表DDL'));
            }
          });
        });
      } else {
        throw new Error('不支持的数据库类型');
      }
    } catch (error) {
      throw new Error(`获取表DDL失败: ${error.message}`);
    }
  }
}

module.exports = new DatabaseManager();


