import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  InputNumber,
  message,
  Tabs,
  Modal,
  Space,
  Divider,
  Popconfirm,
  Radio,
  Segmented,
} from 'antd';
import {
  UserOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  BgColorsOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import SkillTab from './SkillTab';
import useUserStore from '@/store/useUserStore';
import useThemeStore from '@/store/useThemeStore';
import { updateUserInfo, exportUserData } from '@client/api';
import type { UpdateUserDto } from '@client/entities';

const { TabPane } = Tabs;
const { TextArea } = Input;

const Setting = () => {
  const { user, getUserInfo } = useUserStore();
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const [profileForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
          label="用户名"
          name="name"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input disabled placeholder="请输入用户名" />
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
          <Radio.Group name="gender">
            <Radio value="male">男</Radio>
            <Radio value="female">女</Radio>  
          </Radio.Group>
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


  // 数据管理
  const DataTab = () => (
    <Card title={<><DatabaseOutlined /> 数据管理</>}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <h3>导出数据</h3>
          <p style={{ color: 'var(--ant-color-text-secondary)', marginBottom: 16 }}>
            将您的个人信息导出为 JSON 格式文件
          </p>
          <Button icon={<DownloadOutlined />} onClick={handleExportData}>
            导出数据
          </Button>
        </div>

        <Divider />

        <div>
          <h3>清空数据</h3>
          <p style={{ color: 'var(--ant-color-text-secondary)', marginBottom: 16 }}>
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

  // 外观设置
  const AppearanceTab = () => (
    <Card title={<><BgColorsOutlined /> 外观设置</>}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>主题模式</h3>
          <p style={{ color: 'var(--ant-color-text-secondary)', marginBottom: 16 }}>
            选择浅色或深色界面，设置会自动保存到本地
          </p>
          <Segmented
            value={themeMode}
            onChange={(val) => setThemeMode(val as 'light' | 'dark')}
            options={[
              { label: '浅色', value: 'light', icon: <SunOutlined /> },
              { label: '深色', value: 'dark', icon: <MoonOutlined /> },
            ]}
          />
        </div>
      </Space>
    </Card>
  );

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <Tabs defaultActiveKey="profile" style={{ marginBottom: 24, width: '100%', position: 'sticky', top: 0, left: 0, right: 0 }}>
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
              <BgColorsOutlined />
              外观
            </span>
          }
          key="appearance"
        >
          <AppearanceTab />
        </TabPane>
        {/* <TabPane
          tab={
            <span>
              <LockOutlined />
              账户安全
            </span>
          }
          key="security"
        >
          <SecurityTab />
        </TabPane> */}
        <TabPane
          tab={
            <span>
              <ThunderboltOutlined />
              自定义 Skill
            </span>
          }
          key="skill"
        >
          <SkillTab />
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
