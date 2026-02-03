import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  message,
  Tabs,
  Modal,
  Space,
  Divider,
  Popconfirm,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import useUserStore from '@/store/useUserStore';
import { updateUserInfo, changePassword, exportUserData } from '@client/api';
import type { UpdateUserDto, ChangePasswordDto } from '@client/entities';

const { TabPane } = Tabs;
const { TextArea } = Input;

const Setting = () => {
  const { user, getUserInfo } = useUserStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 加载用户信息
  useEffect(() => {
    getUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当用户信息加载完成后，填充表单
  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        age: user.age,
        job: user.job,
        work_address: user.work_address,
        address: user.address,
        hobby: user.hobby,
        schedule: user.schedule,
      });
    }
  }, [user, profileForm]);

  // 更新个人信息
  const handleUpdateProfile = async (values: UpdateUserDto) => {
    try {
      setLoading(true);
      await updateUserInfo(values);
      message.success('个人信息更新成功');
      await getUserInfo(); // 刷新用户信息
    } catch {
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values: ChangePasswordDto) => {
    try {
      setPasswordLoading(true);
      await changePassword(values);
      message.success('密码修改成功，请重新登录');
      passwordForm.resetFields();

      // 3秒后跳转到登录页
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '修改失败，请重试';
      message.error(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  // 导出数据
  const handleExportData = async () => {
    try {
      const data = await exportUserData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-data-${new Date().getTime()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('数据导出成功');
    } catch {
      message.error('导出失败，请重试');
    }
  };

  // 清空所有数据
  const handleClearData = () => {
    Modal.confirm({
      title: '确认清空所有数据？',
      content: '此操作将删除您的所有待办、聊天记录等数据，且无法恢复！',
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        message.warning('该功能开发中...');
      },
    });
  };

  // 个人档案表单
  const ProfileTab = () => (
    <Card title={<><UserOutlined /> 个人档案</>}>
      <Form
        form={profileForm}
        layout="vertical"
        onFinish={handleUpdateProfile}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          label="姓名"
          name="name"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input placeholder="请输入姓名" />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        <Form.Item
          label="手机号"
          name="phone"
          rules={[{ required: true, message: '请输入手机号' }]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>

        <Form.Item
          label="性别"
          name="gender"
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Select placeholder="请选择性别">
            <Select.Option value="male">男</Select.Option>
            <Select.Option value="female">女</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="年龄"
          name="age"
          rules={[{ required: true, message: '请输入年龄' }]}
        >
          <InputNumber
            min={1}
            max={120}
            placeholder="请输入年龄"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item label="职业" name="job">
          <Input placeholder="请输入职业" />
        </Form.Item>

        <Form.Item label="公司地址" name="work_address">
          <Input placeholder="请输入公司地址" />
        </Form.Item>

        <Form.Item label="居住地" name="address">
          <Input placeholder="请输入居住地" />
        </Form.Item>

        <Form.Item label="兴趣爱好" name="hobby">
          <TextArea
            rows={3}
            placeholder="请输入兴趣爱好，如：跑步、阅读、音乐"
          />
        </Form.Item>

        <Form.Item label="生活作息" name="schedule">
          <TextArea
            rows={3}
            placeholder="请输入生活作息，如：早上7点起床，晚上11点睡觉"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            保存修改
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  // 账户安全表单
  const SecurityTab = () => (
    <Card title={<><LockOutlined /> 账户安全</>}>
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handleChangePassword}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          label="旧密码"
          name="oldPassword"
          rules={[
            { required: true, message: '请输入旧密码' },
            { min: 6, message: '密码长度不能小于 6 位' },
          ]}
        >
          <Input.Password placeholder="请输入旧密码" />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度不能小于 6 位' },
          ]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>

        <Form.Item
          label="确认密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={passwordLoading}
            block
          >
            修改密码
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  // 数据管理
  const DataTab = () => (
    <Card title={<><DatabaseOutlined /> 数据管理</>}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <h3>导出数据</h3>
          <p style={{ color: '#666', marginBottom: 16 }}>
            将您的个人信息导出为 JSON 格式文件
          </p>
          <Button icon={<DownloadOutlined />} onClick={handleExportData}>
            导出数据
          </Button>
        </div>

        <Divider />

        <div>
          <h3>清空数据</h3>
          <p style={{ color: '#666', marginBottom: 16 }}>
            删除所有待办事项和聊天记录（此操作不可恢复）
          </p>
          <Popconfirm
            title="确认清空所有数据？"
            description="此操作将删除您的所有数据，且无法恢复！"
            onConfirm={handleClearData}
            okText="确认清空"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              清空所有数据
            </Button>
          </Popconfirm>
        </div>
      </Space>
    </Card>
  );

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <Tabs defaultActiveKey="profile" style={{ marginBottom: 24, width: '100%' }}>
        <TabPane
          tab={
            <span>
              <UserOutlined />
              个人档案
            </span>
          }
          key="profile"
        >
          <ProfileTab />
        </TabPane>
        <TabPane
          tab={
            <span>
              <LockOutlined />
              账户安全
            </span>
          }
          key="security"
        >
          <SecurityTab />
        </TabPane>
        <TabPane
          tab={
            <span>
              <DatabaseOutlined />
              数据管理
            </span>
          }
          key="data"
        >
          <DataTab />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Setting;
