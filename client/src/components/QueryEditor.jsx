import React, { useState, useRef } from 'react';
import { Card, Button, Table, message, Space, Select, Spin } from 'antd';
import Editor from '@monaco-editor/react';
import { PlayCircleOutlined, ClearOutlined } from '@ant-design/icons';
import { executeQuery, getDatabases } from '../utils/api';
import './QueryEditor.css';

function QueryEditor({ connection, selectedDatabase }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [currentDatabase, setCurrentDatabase] = useState(selectedDatabase || '');
  const editorRef = useRef(null);

  // 示例查询
  const exampleQueries = {
    '查询所有表': `SHOW TABLES`,
    '查询指定数据库的表': `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'jasper_platform'`,
    '查询表结构': `DESCRIBE table_name`,
    '查询表数据': `SELECT * FROM table_name LIMIT 10`,
  };

  React.useEffect(() => {
    if (connection?.connectionId) {
      loadDatabases();
    }
  }, [connection]);

  React.useEffect(() => {
    setCurrentDatabase(selectedDatabase || '');
  }, [selectedDatabase]);

  const loadDatabases = async () => {
    if (!connection?.connectionId) return;
    try {
      const dbList = await getDatabases(connection.connectionId);
      setDatabases(dbList);
    } catch (error) {
      console.error('加载数据库列表失败:', error);
    }
  };

  const handleExecute = async () => {
    if (!connection?.connectionId) {
      message.warning('请先连接数据库');
      return;
    }

    if (!query.trim()) {
      message.warning('请输入SQL查询语句');
      return;
    }

    setLoading(true);
    try {
      console.log('执行查询:', {
        connectionId: connection.connectionId,
        database: currentDatabase || '未指定',
        query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
      });

      const result = await executeQuery(
        connection.connectionId,
        currentDatabase || undefined,
        query
      );
      
      console.log('查询结果:', {
        rows: result.rows?.length || 0,
        fields: result.fields?.length || 0
      });

      setResults(result);
      message.success(`查询执行成功，返回 ${result.rows?.length || 0} 条记录`);
    } catch (error) {
      console.error('查询执行失败:', error);
      message.error('查询执行失败: ' + error.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const columns = results?.fields?.length > 0
    ? results.fields.map(field => ({
        title: field.name,
        dataIndex: field.name,
        key: field.name,
        ellipsis: true,
      }))
    : results?.rows?.length > 0
    ? Object.keys(results.rows[0]).map(key => ({
        title: key,
        dataIndex: key,
        key: key,
        ellipsis: true,
      }))
    : [];

  const dataSource = results?.rows?.map((row, index) => ({
    ...row,
    key: index,
  })) || [];

  return (
    <div className="query-editor">
      <Card
        title="SQL查询编辑器"
        extra={
          <Space>
            {connection && (
              <>
                <Select
                  value={currentDatabase}
                  onChange={setCurrentDatabase}
                  placeholder="选择数据库"
                  style={{ width: 200 }}
                  allowClear
                >
                  {databases.map(db => (
                    <Select.Option key={db} value={db}>
                      {db}
                    </Select.Option>
                  ))}
                </Select>
                <Select
                  placeholder="示例查询"
                  style={{ width: 150 }}
                  onChange={(value) => {
                    if (value && exampleQueries[value]) {
                      setQuery(exampleQueries[value]);
                      if (editorRef.current) {
                        editorRef.current.setValue(exampleQueries[value]);
                      }
                    }
                  }}
                >
                  {Object.keys(exampleQueries).map(key => (
                    <Select.Option key={key} value={key}>{key}</Select.Option>
                  ))}
                </Select>
              </>
            )}
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleExecute}
              loading={loading}
            >
              执行
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
            >
              清空
            </Button>
          </Space>
        }
        className="query-card"
      >
        <div className="editor-container">
          <Editor
            height="400px"
            defaultLanguage="sql"
            value={query}
            onChange={(value) => setQuery(value || '')}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </Card>

      {results && (
        <Card
          title="查询结果"
          className="results-card"
          extra={
            <span>
              共 {results.affectedRows || results.rows?.length || 0} 条记录
            </span>
          }
        >
          {results.rows && results.rows.length > 0 ? (
            <Table
              columns={columns}
              dataSource={dataSource}
              pagination={{
                pageSize: 100,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              scroll={{ x: 'max-content', y: 400 }}
              size="small"
            />
          ) : (
            <div className="no-results">
              <p>查询已执行，无返回数据</p>
              {results.affectedRows > 0 && (
                <p>影响行数: {results.affectedRows}</p>
              )}
            </div>
          )}
        </Card>
      )}

      {!connection && (
        <Card className="results-card">
          <div className="no-connection">
            <p>请先连接数据库</p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default QueryEditor;

