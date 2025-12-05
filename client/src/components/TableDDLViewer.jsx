import React, { useState, useEffect } from 'react';
import { Card, Button, Spin, message, Space } from 'antd';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { getTableDDL } from '../utils/api';
import './TableDDLViewer.css';

function TableDDLViewer({ connection, database, table }) {
  const [ddl, setDdl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connection?.connectionId && database && table) {
      loadDDL();
    } else {
      setDdl('');
    }
  }, [connection, database, table]);

  const loadDDL = async () => {
    if (!connection?.connectionId || !database || !table) return;

    setLoading(true);
    try {
      const ddlText = await getTableDDL(connection.connectionId, database, table);
      setDdl(ddlText);
    } catch (error) {
      message.error('加载DDL失败: ' + error.message);
      setDdl('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (ddl) {
      navigator.clipboard.writeText(ddl).then(() => {
        message.success('DDL已复制到剪贴板');
      }).catch(() => {
        message.error('复制失败');
      });
    }
  };

  if (!connection) {
    return (
      <div className="ddl-viewer">
        <Card>
          <p>请先连接数据库</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="ddl-viewer">
      <div className="ddl-toolbar">
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadDDL}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!ddl}
          >
            复制
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <div className="ddl-editor-container">
          <Editor
            height="600px"
            defaultLanguage="sql"
            value={ddl || '-- 正在加载DDL...'}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </Spin>
    </div>
  );
}

export default TableDDLViewer;

