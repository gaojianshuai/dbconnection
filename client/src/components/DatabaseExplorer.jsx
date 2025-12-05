import React, { useState, useEffect } from 'react';
import {
  Card,
  Tree,
  Table,
  Spin,
  Empty,
  message,
  Tabs,
  Tag,
} from 'antd';
import {
  DatabaseOutlined,
  TableOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  getDatabases,
  getTables,
  getTableStructure,
} from '../utils/api';
import TableDataEditor from './TableDataEditor';
import TableStructureEditor from './TableStructureEditor';
import TableDDLViewer from './TableDDLViewer';
import './DatabaseExplorer.css';

const { TabPane } = Tabs;

function DatabaseExplorer({
  connection,
  selectedDatabase,
  selectedTable,
  onSelectDatabase,
  onSelectTable,
}) {
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState({});
  const [tableStructure, setTableStructure] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState([]);

  useEffect(() => {
    if (connection?.connectionId) {
      loadDatabases();
    } else {
      setDatabases([]);
      setTables({});
    }
  }, [connection]);

  useEffect(() => {
    if (connection?.connectionId && selectedDatabase && selectedTable) {
      loadTableStructure();
    }
  }, [connection, selectedDatabase, selectedTable]);

  const loadDatabases = async () => {
    if (!connection?.connectionId) return;
    
    setLoading(true);
    try {
      const dbList = await getDatabases(connection.connectionId);
      setDatabases(dbList);
    } catch (error) {
      message.error('加载数据库列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (database) => {
    if (!connection?.connectionId) return;
    
    if (tables[database]) return; // 已加载
    
    setLoading(true);
    try {
      const tableList = await getTables(connection.connectionId, database);
      setTables(prev => ({ ...prev, [database]: tableList }));
    } catch (error) {
      message.error('加载表列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTableStructure = async () => {
    if (!connection?.connectionId || !selectedDatabase || !selectedTable) {
      if (!connection?.connectionId) {
        message.error('连接不存在，请重新连接数据库');
      }
      return;
    }
    
    setLoading(true);
    try {
      const structure = await getTableStructure(
        connection.connectionId,
        selectedDatabase,
        selectedTable
      );
      setTableStructure(structure);
    } catch (error) {
      console.error('加载表结构错误:', error);
      message.error('加载表结构失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };


  const buildTreeData = () => {
    return databases.map(db => ({
      title: (
        <span className="tree-node">
          <DatabaseOutlined />
          <span>{db}</span>
        </span>
      ),
      key: `db_${db}`,
      isLeaf: false,
      database: db, // 存储数据库名
      children: (tables[db] || []).map(table => ({
        title: (
          <span className="tree-node">
            <TableOutlined />
            <span>{table}</span>
          </span>
        ),
        key: `table_${db}_${table}`,
        isLeaf: true,
        database: db, // 存储数据库名
        table: table, // 存储表名
      })),
    }));
  };

  const handleSelect = (selectedKeys, info) => {
    if (!info.node) return;
    
    const node = info.node;
    console.log('选择节点:', { key: node.key, database: node.database, table: node.table });
    
    // 直接从node的data中获取数据库名和表名，而不是从key解析
    if (node.key.startsWith('db_')) {
      const db = node.database || node.key.replace('db_', '');
      console.log('选择数据库:', db);
      onSelectDatabase(db);
      onSelectTable(null);
      loadTables(db);
    } else if (node.key.startsWith('table_')) {
      // 直接从node的data属性获取，避免解析key的问题
      const db = node.database;
      const table = node.table;
      if (db && table) {
        console.log('选择表:', { database: db, table: table });
        onSelectDatabase(db);
        onSelectTable(table);
      } else {
        // 降级方案：从key解析（兼容旧数据）
        const parts = node.key.replace('table_', '').split('_');
        const dbName = parts[0];
        const tableName = parts.slice(1).join('_');
        console.log('从key解析表:', { database: dbName, table: tableName });
        onSelectDatabase(dbName);
        onSelectTable(tableName);
      }
    }
  };

  const handleExpand = (expandedKeys, { node, expanded }) => {
    setExpandedKeys(expandedKeys);
    if (expanded && node.key.startsWith('db_')) {
      // 直接从node的data中获取数据库名
      const db = node.database || node.key.replace('db_', '');
      loadTables(db);
    }
  };

  const structureColumns = [
    {
      title: '字段名',
      dataIndex: 'field',
      key: 'field',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '允许NULL',
      dataIndex: 'null',
      key: 'null',
      render: (val) => val === 'YES' ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>,
    },
    {
      title: '键',
      dataIndex: 'key',
      key: 'key',
      render: (val) => val ? <Tag color="blue">{val}</Tag> : '-',
    },
    {
      title: '默认值',
      dataIndex: 'default',
      key: 'default',
      render: (val) => val ?? '-',
    },
    {
      title: '额外',
      dataIndex: 'extra',
      key: 'extra',
      render: (val) => val || '-',
    },
  ];


  if (!connection) {
    return (
      <Card className="explorer-card">
        <Empty description="请先连接数据库" />
      </Card>
    );
  }

  return (
    <div className="database-explorer">
      <div className="explorer-sidebar">
        <Card
          title="数据库结构"
          className="tree-card"
          extra={
            <Spin spinning={loading} indicator={<LoadingOutlined />} />
          }
        >
          <Tree
            treeData={buildTreeData()}
            onSelect={handleSelect}
            onExpand={handleExpand}
            expandedKeys={expandedKeys}
            showIcon
            blockNode
          />
        </Card>
      </div>
      <div className="explorer-content">
        {selectedTable ? (
          <Card
            title={`表: ${selectedTable}`}
            className="table-card"
          >
            <Tabs defaultActiveKey="structure">
              <TabPane tab="表结构" key="structure">
                <TableStructureEditor
                  connection={connection}
                  database={selectedDatabase}
                  table={selectedTable}
                  tableStructure={tableStructure}
                  onRefresh={loadTableStructure}
                />
              </TabPane>
              <TabPane tab="表数据" key="data">
                <TableDataEditor
                  connection={connection}
                  database={selectedDatabase}
                  table={selectedTable}
                  tableStructure={tableStructure}
                />
              </TabPane>
            </Tabs>
          </Card>
        ) : selectedDatabase ? (
          <Card className="table-card">
            <Empty description={`请选择表查看详细信息`} />
          </Card>
        ) : (
          <Card className="table-card">
            <Empty description="请选择数据库或表" />
          </Card>
        )}
      </div>
    </div>
  );
}

export default DatabaseExplorer;

