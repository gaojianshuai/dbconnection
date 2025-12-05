import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Tag,
  Switch,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { alterTable, getTableStructure } from '../utils/api';
import './TableStructureEditor.css';

const { Option } = Select;
const { TextArea } = Input;

// MySQL数据类型
const MYSQL_TYPES = [
  'INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT',
  'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'TINYTEXT',
  'DECIMAL', 'FLOAT', 'DOUBLE',
  'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR',
  'BLOB', 'LONGBLOB', 'MEDIUMBLOB', 'TINYBLOB',
  'BOOLEAN', 'JSON',
];

// PostgreSQL数据类型
const POSTGRESQL_TYPES = [
  'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL',
  'VARCHAR', 'CHAR', 'TEXT',
  'NUMERIC', 'DECIMAL', 'REAL', 'DOUBLE PRECISION',
  'DATE', 'TIMESTAMP', 'TIME', 'INTERVAL',
  'BOOLEAN', 'JSON', 'JSONB',
];

function TableStructureEditor({ connection, database, table, tableStructure, onRefresh }) {
  const [editingKey, setEditingKey] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const dbType = connection?.type || 'mysql';
  const dataTypes = dbType === 'postgresql' ? POSTGRESQL_TYPES : MYSQL_TYPES;

  const handleEdit = (record) => {
    setEditingKey(record.field);
    setEditingRow({ ...record });
  };

  const handleCancel = () => {
    setEditingKey('');
    setEditingRow(null);
  };

  const handleSave = async () => {
    if (!editingRow) return;

    try {
      const changes = {
        action: 'MODIFY',
        field: editingRow.field,
        newField: editingRow.field,
        type: editingRow.type,
        null: editingRow.null,
        default: editingRow.default,
        extra: editingRow.extra,
      };

      await alterTable(connection.connectionId, database, table, changes);
      message.success('修改成功');
      handleCancel();
      onRefresh();
    } catch (error) {
      message.error('修改失败: ' + error.message);
    }
  };

  const handleDelete = async (field) => {
    try {
      const changes = {
        action: 'DROP',
        field: field,
      };

      await alterTable(connection.connectionId, database, table, changes);
      message.success('删除成功');
      onRefresh();
    } catch (error) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleAdd = () => {
    addForm.resetFields();
    addForm.setFieldsValue({
      null: 'YES',
      position: 'AFTER',
      afterField: tableStructure?.[0]?.field || '',
    });
    setIsAddModalVisible(true);
  };

  const handleAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      
      const changes = {
        action: 'ADD',
        field: values.field,
        type: values.type + (values.length ? `(${values.length})` : ''),
        null: values.null,
        default: values.default || null,
        extra: values.extra || '',
        position: values.position,
        afterField: values.afterField,
      };

      await alterTable(connection.connectionId, database, table, changes);
      message.success('添加成功');
      setIsAddModalVisible(false);
      addForm.resetFields();
      onRefresh();
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error('添加失败: ' + error.message);
    }
  };

  const isEditing = (record) => {
    return editingKey === record.field;
  };

  const columns = [
    {
      title: '字段名',
      dataIndex: 'field',
      key: 'field',
      width: 150,
      render: (text, record) => {
        if (isEditing(record)) {
          return (
            <Input
              value={editingRow.field}
              onChange={(e) => setEditingRow({ ...editingRow, field: e.target.value })}
            />
          );
        }
        return (
          <span>
            {text}
            {record.key === 'PRI' && <Tag color="blue" style={{ marginLeft: 4 }}>主键</Tag>}
          </span>
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (text, record) => {
        if (isEditing(record)) {
          return (
            <Select
              value={editingRow.type}
              onChange={(value) => setEditingRow({ ...editingRow, type: value })}
              style={{ width: '100%' }}
            >
              {dataTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          );
        }
        return text;
      },
    },
    {
      title: '允许NULL',
      dataIndex: 'null',
      key: 'null',
      width: 100,
      render: (text, record) => {
        if (isEditing(record)) {
          return (
            <Select
              value={editingRow.null}
              onChange={(value) => setEditingRow({ ...editingRow, null: value })}
              style={{ width: '100%' }}
            >
              <Option value="YES">是</Option>
              <Option value="NO">否</Option>
            </Select>
          );
        }
        return text === 'YES' ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>;
      },
    },
    {
      title: '默认值',
      dataIndex: 'default',
      key: 'default',
      width: 150,
      render: (text, record) => {
        if (isEditing(record)) {
          return (
            <Input
              value={editingRow.default ?? ''}
              onChange={(e) => setEditingRow({ ...editingRow, default: e.target.value || null })}
              placeholder="留空表示无默认值"
            />
          );
        }
        return text ?? '-';
      },
    },
    {
      title: '额外',
      dataIndex: 'extra',
      key: 'extra',
      width: 150,
      render: (text, record) => {
        if (isEditing(record)) {
          return (
            <Input
              value={editingRow.extra ?? ''}
              onChange={(e) => setEditingRow({ ...editingRow, extra: e.target.value })}
              placeholder="如: auto_increment"
            />
          );
        }
        return text || '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <Button
              type="link"
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              保存
            </Button>
            <Button
              type="link"
              onClick={handleCancel}
            >
              取消
            </Button>
          </Space>
        ) : (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={editingKey !== ''}
            >
              编辑
            </Button>
            {record.key !== 'PRI' && (
              <Popconfirm
                title="确定要删除这个字段吗？"
                onConfirm={() => handleDelete(record.field)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={editingKey !== ''}
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="table-structure-editor">
      <div className="editor-toolbar">
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={editingKey !== ''}
          >
            添加字段
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={tableStructure.map((item, index) => ({
          ...item,
          key: item.field || index,
        }))}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title="添加字段"
        open={isAddModalVisible}
        onOk={handleAddOk}
        onCancel={() => {
          setIsAddModalVisible(false);
          addForm.resetFields();
        }}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={addForm}
          layout="vertical"
        >
          <Form.Item
            name="field"
            label="字段名"
            rules={[{ required: true, message: '请输入字段名' }]}
          >
            <Input placeholder="例如: user_name" />
          </Form.Item>

          <Form.Item
            name="type"
            label="数据类型"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="选择数据类型">
              {dataTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.type !== curr.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              const needsLength = type && (type.includes('VARCHAR') || type.includes('CHAR'));
              if (needsLength) {
                return (
                  <Form.Item
                    name="length"
                    label="长度"
                    rules={[{ required: true, message: '请输入长度' }]}
                  >
                    <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="例如: 255" />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="null"
            label="允许NULL"
            initialValue="YES"
          >
            <Select>
              <Option value="YES">是</Option>
              <Option value="NO">否</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="default"
            label="默认值"
          >
            <Input placeholder="留空表示无默认值" />
          </Form.Item>

          <Form.Item
            name="extra"
            label="额外属性"
          >
            <Input placeholder="例如: auto_increment" />
          </Form.Item>

          <Form.Item
            name="position"
            label="位置"
            initialValue="AFTER"
          >
            <Select>
              <Option value="FIRST">第一个</Option>
              <Option value="AFTER">在指定字段之后</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.position !== curr.position}
          >
            {({ getFieldValue }) => {
              const position = getFieldValue('position');
              if (position === 'AFTER') {
                return (
                  <Form.Item
                    name="afterField"
                    label="在哪个字段之后"
                    rules={[{ required: true, message: '请选择字段' }]}
                  >
                    <Select placeholder="选择字段">
                      {tableStructure?.map(field => (
                        <Option key={field.field} value={field.field}>{field.field}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TableStructureEditor;

