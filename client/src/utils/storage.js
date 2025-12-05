// 本地存储工具函数

const STORAGE_KEYS = {
  ACTIVE_CONNECTION: 'db_platform_active_connection',
  SELECTED_DATABASE: 'db_platform_selected_database',
  SELECTED_TABLE: 'db_platform_selected_table',
  ACTIVE_TAB: 'db_platform_active_tab',
  AUTH_TOKEN: 'db_platform_auth_token',
};

export const storage = {
  // 认证
  saveAuthToken(token) {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  },

  getAuthToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  // 保存活跃连接
  saveActiveConnection(connection) {
    if (connection) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CONNECTION, JSON.stringify({
        id: connection.id,
        name: connection.name,
        type: connection.type,
        host: connection.host,
        port: connection.port,
        user: connection.user,
        database: connection.database,
        // 不保存 connectionId，因为需要重新连接
      }));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONNECTION);
    }
  },

  // 获取活跃连接
  getActiveConnection() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONNECTION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('读取连接状态失败:', error);
      return null;
    }
  },

  // 保存选中的数据库
  saveSelectedDatabase(database) {
    if (database) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_DATABASE, database);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_DATABASE);
    }
  },

  // 获取选中的数据库
  getSelectedDatabase() {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_DATABASE) || null;
  },

  // 保存选中的表
  saveSelectedTable(table) {
    if (table) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_TABLE, table);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_TABLE);
    }
  },

  // 获取选中的表
  getSelectedTable() {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_TABLE) || null;
  },

  // 保存活动标签
  saveActiveTab(tab) {
    if (tab) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tab);
    }
  },

  // 获取活动标签
  getActiveTab() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB) || 'explorer';
  },

  // 清除所有状态
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};

