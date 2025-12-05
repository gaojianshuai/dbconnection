import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Popconfirm,
  message,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Select,
  Tag,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { getTableData, insertRow, updateRow, deleteRow } from '../utils/api';
import './TableDataEditor.css';

const { TextArea } = Input;

function TableDataEditor({ connection, database, table, tableStructure }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 100,
    total: 0,
  });

  useEffect(() => {
    if (connection?.connectionId && database && table) {
      loadData();
    }
  }, [connection, database, table, pagination.current, pagination.pageSize]);

  const loadData = async () => {
    if (!connection?.connectionId || !database || !table) return;
    
    setLoading(true);
    try {
      const result = await getTableData(
        connection.connectionId,
        database,
        table,
        pagination.current,
        pagination.pageSize
      );
      setData(result.data || []);
      setPagination(prev => ({ ...prev, total: result.total || 0 }));
    } catch (error) {
      message.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = (record) => {
    return editingKey === getRowKey(record);
  };

  const getRowKey = (record) => {
    // 使用主键或第一个字段作为key
    const primaryKey = tableStructure?.find(f => f.key === 'PRI')?.field;
    if (primaryKey && record[primaryKey] !== undefined) {
      return record[primaryKey];
    }
    return record[Object.keys(record)[0]];
  };

  const handleEdit = (record) => {
    setEditingKey(getRowKey(record));
    setEditingRow({ ...record });
  };

  const handleCancel = () => {
    setEditingKey('');
    setEditingRow(null);
  };

  const handleSave = async (key) => {
    try {
      const row = editingRow;
      const primaryKey = tableStructure?.find(f => f.key === 'PRI')?.field;
      
      if (!primaryKey) {
        message.warning('该表没有主键，无法更新');
        return;
      }

      // 清理数据
      const cleanedRow = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value === '' || value === undefined) {
          cleanedRow[key] = null;
        } else {
          cleanedRow[key] = value;
        }
      });

      await updateRow(
        connection.connectionId,
        database,
        table,
        primaryKey,
        cleanedRow[primaryKey],
        cleanedRow
      );

      message.success('更新成功');
      setEditingKey('');
      setEditingRow(null);
      loadData();
    } catch (error) {
      console.error('更新数据错误:', error);
      message.error('更新失败: ' + error.message);
    }
  };

  const handleDelete = async (record) => {
    try {
      const primaryKey = tableStructure?.find(f => f.key === 'PRI')?.field;
      
      if (!primaryKey) {
        message.warning('该表没有主键，无法删除');
        return;
      }

      await deleteRow(
        connection.connectionId,
        database,
        table,
        primaryKey,
        record[primaryKey]
      );

      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleAdd = () => {
    const newRow = {};
    tableStructure?.forEach(field => {
      if (field.extra?.includes('auto_increment')) {
        // 自增字段不设置
      } else if (field.default !== null && field.default !== undefined && field.default !== '') {
        // 处理默认值
        let defaultValue = field.default;
        // 如果默认值是函数调用（如CURRENT_TIMESTAMP），不设置
        if (typeof defaultValue === 'string' && defaultValue.includes('(')) {
          defaultValue = undefined;
        }
        if (defaultValue !== undefined) {
          newRow[field.field] = defaultValue;
        }
      }
    });
    form.setFieldsValue(newRow);
    setIsModalVisible(true);
  };

  const handleAddOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 清理数据：移除空字符串，转换为null
      const cleanedValues = {};
      Object.keys(values).forEach(key => {
        const value = values[key];
        if (value === '' || value === undefined) {
          cleanedValues[key] = null;
        } else if (value && typeof value === 'object' && value.format) {
          // 处理日期选择器的值
          cleanedValues[key] = value.format('YYYY-MM-DD HH:mm:ss');
        } else {
          cleanedValues[key] = value;
        }
      });
      
      await insertRow(connection.connectionId, database, table, cleanedValues);
      message.success('添加成功');
      setIsModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      console.error('添加数据错误:', error);
      message.error('添加失败: ' + error.message);
    }
  };

  const renderFieldInput = (field) => {
    const fieldType = field.type?.toLowerCase() || '';

    if (fieldType.includes('int') || fieldType.includes('decimal') || fieldType.includes('float') || fieldType.includes('double') || fieldType.includes('numeric')) {
      return <InputNumber style={{ width: '100%' }} />;
    }

    if (fieldType.includes('date') || fieldType.includes('time') || fieldType === 'datetime' || fieldType === 'timestamp') {
      return <DatePicker style={{ width: '100%' }} showTime={fieldType.includes('time') || fieldType === 'datetime' || fieldType === 'timestamp'} format="YYYY-MM-DD HH:mm:ss" />;
    }

    if (fieldType.includes('text') || fieldType.includes('blob') || fieldType.includes('longtext') || fieldType.includes('mediumtext')) {
      return <TextArea rows={3} />;
    }

    if (fieldType.includes('char') && fieldType.includes('255')) {
      // 较短的字符串字段
      return <Input maxLength={255} />;
    }

    return <Input />;
  };

  const buildColumns = () => {
    if (!tableStructure || tableStructure.length === 0) {
      return data.length > 0 ? Object.keys(data[0]).map(key => ({
        title: key,
        dataIndex: key,
        key: key,
      })) : [];
    }

    return tableStructure.map(field => {
      const column = {
        title: (
          <span>
            {field.field}
            {field.key === 'PRI' && <Tag color="blue" style={{ marginLeft: 4 }}>主键</Tag>}
            {field.null === 'NO' && <Tag color="red" style={{ marginLeft: 4 }}>必填</Tag>}
          </span>
        ),
        dataIndex: field.field,
        key: field.field,
        width: 150,
        ellipsis: true,
        render: (text, record) => {
          if (isEditing(record)) {
            return (
              <Input
                value={editingRow[field.field]}
                onChange={(e) => {
                  setEditingRow({
                    ...editingRow,
                    [field.field]: e.target.value,
                  });
                }}
                style={{ width: '100%' }}
              />
            );
          }
          return text ?? '-';
        },
      };

      return column;
    });
  };

  const columns = [
    ...buildColumns(),
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
              onClick={() => handleSave(getRowKey(record))}
            >
              保存
            </Button>
            <Button
              type="link"
              icon={<CloseOutlined />}
              onClick={handleCancel}
            >
              取消
            </Button>
          </Space>
        ) : (
          <Space>
            <Tooltip title="编辑">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                disabled={editingKey !== ''}
              />
            </Tooltip>
            <Popconfirm
              title="确定要删除这条记录吗？"
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={editingKey !== ''}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="table-data-editor">
      <div className="editor-toolbar">
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={editingKey !== ''}
          >
            新增
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data.map((item, index) => ({
          ...item,
          key: getRowKey(item) || index,
        }))}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }));
          },
        }}
        scroll={{ x: 'max-content', y: 500 }}
        size="small"
        bordered
      />

      <Modal
        title="新增记录"
        open={isModalVisible}
        onOk={handleAddOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={800}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          {tableStructure?.map(field => {
            const isReadonly = field.extra?.includes('auto_increment');
            const isRequired = field.null === 'NO' && !field.default && !isReadonly;

            if (isReadonly) {
              return null; // 跳过自增字段
            }

            return (
              <Form.Item
                key={field.field}
                label={
                  <span>
                    {field.field}
                    {field.key === 'PRI' && <Tag color="blue" style={{ marginLeft: 4 }}>主键</Tag>}
                    {isRequired && <Tag color="red" style={{ marginLeft: 4 }}>必填</Tag>}
                  </span>
                }
                name={field.field}
                rules={[
                  {
                    required: isRequired,
                    message: `请输入${field.field}`,
                  },
                ]}
              >
                {renderFieldInput(field)}
              </Form.Item>
            );
          })}
        </Form>
      </Modal>
    </div>
  );
}

export default TableDataEditor;

