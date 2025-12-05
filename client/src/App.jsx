import React, { useState, useEffect } from 'react';
import { Layout, message, Button, Space } from 'antd';
import ConnectionManager from './components/ConnectionManager';
import DatabaseExplorer from './components/DatabaseExplorer';
import QueryEditor from './components/QueryEditor';
import { getConnections, createConnection, deleteConnection, checkConnectionStatus } from './utils/api';
import { storage } from './utils/storage';
import Login from './components/Login';
import './App.css';

const { Header, Content, Sider } = Layout;

function App() {
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState(storage.getActiveTab()); // 'explorer' or 'query'
  const [restoring, setRestoring] = useState(true);
  const [authenticated, setAuthenticated] = useState(!!storage.getAuthToken());

  useEffect(() => {
    loadConnections();
    restoreConnectionState();
  }, []);

  // 恢复连接状态
  const restoreConnectionState = async () => {
    try {
      // 未登录则不恢复
      if (!storage.getAuthToken()) {
        setRestoring(false);
        return;
      }

      const savedConnection = storage.getActiveConnection();
      const savedDatabase = storage.getSelectedDatabase();
      const savedTable = storage.getSelectedTable();

      if (savedConnection) {
        // 检查连接是否仍然有效
        try {
          const status = await checkConnectionStatus(savedConnection.id);
          if (status && status.connected) {
            // 连接仍然有效，恢复状态
            setActiveConnection({
              ...savedConnection,
              connectionId: status.connectionId || savedConnection.id,
            });
            if (savedDatabase) {
              setSelectedDatabase(savedDatabase);
            }
            if (savedTable) {
              setSelectedTable(savedTable);
            }
            message.success(`已恢复连接: ${savedConnection.name}`, 2);
          } else {
            // 连接已断开，清除保存的状态
            storage.saveActiveConnection(null);
            storage.saveSelectedDatabase(null);
            storage.saveSelectedTable(null);
            message.info('之前的连接已断开，请重新连接', 3);
          }
        } catch (error) {
          // 检查失败，可能是连接不存在或已断开
          storage.saveActiveConnection(null);
          storage.saveSelectedDatabase(null);
          storage.saveSelectedTable(null);
          console.warn('恢复连接状态失败:', error);
          // 不显示错误消息，避免干扰用户
        }
      }
    } catch (error) {
      console.error('恢复连接状态错误:', error);
    } finally {
      setRestoring(false);
    }
  };

  const loadConnections = async () => {
    try {
      const data = await getConnections();
      setConnections(data);
    } catch (error) {
      message.error('加载连接列表失败: ' + error.message);
    }
  };

  const handleCreateConnection = async (config) => {
    try {
      const result = await createConnection(config);
      await loadConnections();
      message.success('连接创建成功');
      return result;
    } catch (error) {
      message.error('创建连接失败: ' + error.message);
      throw error;
    }
  };

  const handleDeleteConnection = async (id) => {
    try {
      await deleteConnection(id);
      await loadConnections();
      if (activeConnection?.id === id) {
        setActiveConnection(null);
        setSelectedDatabase(null);
        setSelectedTable(null);
        // 清除本地存储
        storage.saveActiveConnection(null);
        storage.saveSelectedDatabase(null);
        storage.saveSelectedTable(null);
      }
      message.success('连接已删除');
    } catch (error) {
      message.error('删除连接失败: ' + error.message);
    }
  };

  const handleConnect = async (connection, password) => {
    try {
      const response = await fetch(`/api/connections/${connection.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (data.success) {
        const activeConn = { ...connection, connectionId: data.connectionId };
        setActiveConnection(activeConn);
        // 保存连接状态到本地存储
        storage.saveActiveConnection(connection);
        message.success('连接成功');
      } else {
        throw new Error(data.error || '连接失败');
      }
    } catch (error) {
      message.error('连接失败: ' + error.message);
      throw error;
    }
  };

  // 当连接状态改变时，更新本地存储
  useEffect(() => {
    if (activeConnection) {
      storage.saveActiveConnection(activeConnection);
    } else {
      storage.saveActiveConnection(null);
      storage.saveSelectedDatabase(null);
      storage.saveSelectedTable(null);
    }
  }, [activeConnection]);

  // 保存选中的数据库和表
  useEffect(() => {
    storage.saveSelectedDatabase(selectedDatabase);
  }, [selectedDatabase]);

  useEffect(() => {
    storage.saveSelectedTable(selectedTable);
  }, [selectedTable]);

  useEffect(() => {
    storage.saveActiveTab(activeTab);
  }, [activeTab]);

  // 退出登录
  const handleLogout = () => {
    storage.saveAuthToken(null);
    storage.clearAll();
    setAuthenticated(false);
    setActiveConnection(null);
    setSelectedDatabase(null);
    setSelectedTable(null);
    message.success('已退出');
  };

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Jasper数据库管理</h1>
          <div className="header-tabs">
            <span
              className={activeTab === 'explorer' ? 'active' : ''}
              onClick={() => setActiveTab('explorer')}
            >
              数据库浏览
            </span>
            <span
              className={activeTab === 'query' ? 'active' : ''}
              onClick={() => setActiveTab('query')}
            >
              SQL查询
            </span>
          </div>
          <Space>
            {activeConnection && <span className="active-conn-name">已连接: {activeConnection.name}</span>}
            <Button size="small" onClick={handleLogout}>退出登录</Button>
          </Space>
        </div>
      </Header>
      <Layout>
        <Sider width={300} className="app-sider">
          <ConnectionManager
            connections={connections}
            activeConnection={activeConnection}
            onCreateConnection={handleCreateConnection}
            onDeleteConnection={handleDeleteConnection}
            onConnect={handleConnect}
            onSelectConnection={setActiveConnection}
          />
        </Sider>
        <Content className="app-content">
          {activeTab === 'explorer' ? (
            <DatabaseExplorer
              connection={activeConnection}
              selectedDatabase={selectedDatabase}
              selectedTable={selectedTable}
              onSelectDatabase={setSelectedDatabase}
              onSelectTable={setSelectedTable}
            />
          ) : (
            <QueryEditor
              connection={activeConnection}
              selectedDatabase={selectedDatabase}
            />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;

