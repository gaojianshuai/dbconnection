import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined, UserOutlined, LoginOutlined } from '@ant-design/icons';
import { storage } from '../utils/storage';
import './Login.css';

const { Title, Text } = Typography;

const VALID_USER = 'gaojs';
const VALID_PASS = 'gjs199074';

function Login({ onLogin }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const { username, password } = values;
      if (username === VALID_USER && password === VALID_PASS) {
        // 简单的本地验证，通过即设置已登录状态
        storage.saveAuthToken('logged-in');
        message.success('登录成功');
        onLogin();
      } else {
        message.error('账号或密码错误');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-overlay" />
        <div className="login-content">
          <Card className="login-card" bordered={false}>
            <div className="login-header">
              <div className="logo-circle">
                <span>J</span>
              </div>
              <div>
                <Title level={3} className="login-title">Jasper数据库管理</Title>
                <Text type="secondary">安全 · 高效 · 现代化的数据库平台</Text>
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ username: VALID_USER, password: VALID_PASS }}
            >
              <Form.Item
                name="username"
                label="账号"
                rules={[{ required: true, message: '请输入账号' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入账号"
                  size="large"
                  autoComplete="username"
                />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                  size="large"
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LoginOutlined />}
                  size="large"
                  block
                  loading={loading}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Login;

