import axios from 'axios';
import { message } from 'antd';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 响应拦截器 - 统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 提取错误信息
    const errorMessage = error.response?.data?.error || error.message || '请求失败';
    console.error('API错误:', errorMessage, error);
    return Promise.reject(new Error(errorMessage));
  }
);

// 连接管理
export const getConnections = () => api.get('/connections').then(res => res.data);
export const createConnection = (config) => api.post('/connections', config).then(res => res.data);
export const testConnection = (config) => api.post('/connections/test', config).then(res => res.data);
export const deleteConnection = (id) => api.delete(`/connections/${id}`).then(res => res.data);
export const checkConnectionStatus = (id) => api.get(`/connections/${id}/status`).then(res => res.data);

// 数据库操作
export const getDatabases = (connectionId) => 
  api.get(`/databases/${connectionId}`).then(res => res.data);

export const getTables = (connectionId, database) => 
  api.get(`/databases/${connectionId}/${encodeURIComponent(database)}/tables`).then(res => res.data);

export const getTableStructure = (connectionId, database, table) => 
  api.get(`/databases/${connectionId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/structure`).then(res => res.data);

export const getTableData = (connectionId, database, table, page = 1, limit = 100) => 
  api.get(`/databases/${connectionId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/data`, {
    params: { page, limit }
  }).then(res => res.data);

// 查询执行
export const executeQuery = (connectionId, database, query) => 
  api.post(`/query/${connectionId}`, { query, database }).then(res => res.data);

// 表数据操作
export const insertRow = (connectionId, database, table, data) =>
  api.post(`/databases/${connectionId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/insert`, data).then(res => res.data);

export const updateRow = (connectionId, database, table, primaryKey, primaryValue, data) =>
  api.put(`/databases/${connectionId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/update`, {
    primaryKey,
    primaryValue,
    data,
  }).then(res => res.data);

export const deleteRow = (connectionId, database, table, primaryKey, primaryValue) =>
  api.delete(`/databases/${connectionId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/delete`, {
    data: { primaryKey, primaryValue },
  }).then(res => res.data);

// 表结构操作
export const alterTable = (connectionId, database, table, changes) =>
  api.post(`/databases/${connectionId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/alter`, changes).then(res => res.data);

// 获取表DDL
export const getTableDDL = (connectionId, database, table) =>
  api.get(`/databases/${connectionId}/${encodeURIComponent(database)}/${encodeURIComponent(table)}/ddl`).then(res => res.data);

