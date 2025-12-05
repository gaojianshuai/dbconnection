import React, { useState } from 'react';
import {
  Card,
  Button,
  List,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { testConnection } from '../utils/api';
import './ConnectionManager.css';

const { Option } = Select;

const dbTypes = [
  { value: 'mysql', label: 'MySQL', color: 'blue' },
  { value: 'postgresql', label: 'PostgreSQL', color: 'cyan' },
  { value: 'sqlite', label: 'SQLite', color: 'green' },
  { value: 'mongodb', label: 'MongoDB', color: 'orange' },
];

function ConnectionManager({
  connections,
  activeConnection,
  onCreateConnection,
  onDeleteConnection,
  onConnect,
  onSelectConnection,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [currentConnection, setCurrentConnection] = useState(null);
  const [form] = Form.useForm();
  const [connectForm] = Form.useForm();
  const [testing, setTesting] = useState(false);

  const handleCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      await onCreateConnection(values);
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      // 错误已在父组件处理
    }
  };

  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      await testConnection(values);
      message.success('连接测试成功');
    } catch (error) {
      message.error('连接测试失败: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleConnectClick = (connection) => {
    setCurrentConnection(connection);
    connectForm.resetFields();
    setConnectModalVisible(true);
  };

  const handleConnectSubmit = async (values) => {
    try {
      await onConnect(currentConnection, values.password);
      setConnectModalVisible(false);
      connectForm.resetFields();
    } catch (error) {
      // 错误已在父组件处理
    }
  };

  const renderConnectionForm = () => {
    return (
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="连接名称"
          rules={[{ required: true, message: '请输入连接名称' }]}
        >
          <Input placeholder="例如: 本地MySQL" />
        </Form.Item>

        <Form.Item
          name="type"
          label="数据库类型"
          rules={[{ required: true, message: '请选择数据库类型' }]}
        >
          <Select placeholder="选择数据库类型">
            {dbTypes.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
          {({ getFieldValue }) => {
            const type = getFieldValue('type');
            
            if (type === 'sqlite') {
              return (
                <Form.Item
                  name="path"
                  label="数据库文件路径"
                  rules={[{ required: true, message: '请输入数据库文件路径' }]}
                >
                  <Input placeholder="例如: /path/to/database.db" />
                </Form.Item>
              );
            }

            if (type === 'mongodb') {
              return (
                <>
                  <Form.Item
                    name="uri"
                    label="MongoDB连接URI（可选，如果填写则优先使用）"
                    tooltip="如果填写URI，下面的单独字段将被忽略"
                  >
                    <Input placeholder="mongodb://user:password@host:port/database" />
                  </Form.Item>
                  <Form.Item
                    name="host"
                    label="主机"
                    rules={[
                      ({ getFieldValue }) => ({
                        validator: (_, value) => {
                          const uri = getFieldValue('uri');
                          if (uri || value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('请输入主机地址或填写URI'));
                        },
                      }),
                    ]}
                  >
                    <Input placeholder="localhost" />
                  </Form.Item>
                  <Form.Item
                    name="port"
                    label="端口"
                    initialValue={27017}
                  >
                    <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="user"
                    label="用户名"
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="密码"
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item
                    name="database"
                    label="数据库名"
                  >
                    <Input />
                  </Form.Item>
                </>
              );
            }

            return (
              <>
                <Form.Item
                  name="host"
                  label="主机"
                  rules={[{ required: true, message: '请输入主机地址' }]}
                >
                  <Input placeholder="localhost" />
                </Form.Item>
                <Form.Item
                  name="port"
                  label="端口"
                  initialValue={type === 'mysql' ? 3306 : 5432}
                >
                  <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="user"
                  label="用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input placeholder="root" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item
                  name="database"
                  label="数据库名"
                >
                  <Input placeholder="可选" />
                </Form.Item>
              </>
            );
          }}
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
            <Button onClick={handleTest} loading={testing}>
              测试连接
            </Button>
            <Button onClick={() => setModalVisible(false)}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };

  return (
    <div className="connection-manager">
      <Card
        title={
          <div className="card-title">
            <DatabaseOutlined />
            <span>数据库连接</span>
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={handleCreate}
          >
            新建连接
          </Button>
        }
        className="connection-card"
      >
        <List
          dataSource={connections}
          locale={{ emptyText: '暂无连接，点击"新建连接"添加' }}
          renderItem={(connection) => {
            const dbType = dbTypes.find(t => t.value === connection.type);
            const isActive = activeConnection?.id === connection.id;
            
            return (
              <List.Item
                className={`connection-item ${isActive ? 'active' : ''}`}
                actions={[
                  <Popconfirm
                    title="确定要删除这个连接吗？"
                    onConfirm={() => onDeleteConnection(connection.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div className="connection-title">
                      <span>{connection.name}</span>
                      <Tag color={dbType?.color}>{dbType?.label}</Tag>
                    </div>
                  }
                  description={
                    <div className="connection-desc">
                      <div>{connection.host}:{connection.port}</div>
                      {isActive ? (
                        <Tag color="success">已连接</Tag>
                      ) : (
                        <Space>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => handleConnectClick(connection)}
                          >
                            连接
                          </Button>
                        </Space>
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      <Modal
        title="新建数据库连接"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        {renderConnectionForm()}
      </Modal>

      <Modal
        title={`连接: ${currentConnection?.name}`}
        open={connectModalVisible}
        onCancel={() => setConnectModalVisible(false)}
        footer={null}
      >
        <Form form={connectForm} layout="vertical" onFinish={handleConnectSubmit}>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入数据库密码" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                连接
              </Button>
              <Button onClick={() => setConnectModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ConnectionManager;

