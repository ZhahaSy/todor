import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  Table,
  Space,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Typography,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import {
  getSkillList,
  createSkill,
  updateSkill,
  deleteSkill,
  testSkill,
  type SkillItem,
  type CreateSkillPayload,
} from '@client/api';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

// Skill 表单的内部值（config/inputSchema 以 JSON 对象形式编辑）
interface SkillFormValues {
  name: string;
  displayName: string;
  description: string;
  type: 'webhook' | 'flow';
  webhookUrl: string;
  webhookMethod: string;
  webhookHeaders: string; // JSON text
  webhookTimeout: number;
  inputSchema: string; // JSON text
  enabled: boolean;
}

function buildConfigJson(values: SkillFormValues): string {
  const config: Record<string, unknown> = { url: values.webhookUrl, method: values.webhookMethod };
  if (values.webhookHeaders && values.webhookHeaders.trim() !== '{}' && values.webhookHeaders.trim() !== '') {
    try { config.headers = JSON.parse(values.webhookHeaders); } catch { /* ignore */ }
  }
  if (values.webhookTimeout) config.timeout = values.webhookTimeout * 1000;
  return JSON.stringify(config);
}

function parseConfigJson(configStr: string) {
  try {
    const c = JSON.parse(configStr) as { url?: string; method?: string; headers?: Record<string, string>; timeout?: number };
    return {
      webhookUrl: c.url ?? '',
      webhookMethod: c.method ?? 'POST',
      webhookHeaders: c.headers ? JSON.stringify(c.headers, null, 2) : '',
      webhookTimeout: c.timeout ? c.timeout / 1000 : 10,
    };
  } catch {
    return { webhookUrl: '', webhookMethod: 'POST', webhookHeaders: '', webhookTimeout: 10 };
  }
}

const SkillTab = () => {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingSkill, setTestingSkill] = useState<SkillItem | null>(null);
  const [testInput, setTestInput] = useState('{}');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [form] = Form.useForm<SkillFormValues>();

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const list = await getSkillList();
      setSkills(list);
    } catch {
      message.error('获取 Skill 列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSkills(); }, []);

  const openCreate = () => {
    setEditingSkill(null);
    form.resetFields();
    form.setFieldsValue({ type: 'webhook', webhookMethod: 'POST', webhookTimeout: 10, enabled: true });
    setModalOpen(true);
  };

  const openEdit = (skill: SkillItem) => {
    setEditingSkill(skill);
    const parsed = parseConfigJson(skill.config);
    form.setFieldsValue({
      name: skill.name,
      displayName: skill.displayName,
      description: skill.description,
      type: skill.type,
      ...parsed,
      inputSchema: skill.inputSchema && skill.inputSchema !== '{}' ? skill.inputSchema : '',
      enabled: skill.enabled,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values: SkillFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const payload: CreateSkillPayload = {
        name: values.name,
        displayName: values.displayName,
        description: values.description,
        type: values.type,
        config: buildConfigJson(values),
        inputSchema: values.inputSchema && values.inputSchema.trim() ? values.inputSchema.trim() : '{}',
        enabled: values.enabled,
      };
      if (editingSkill) {
        await updateSkill(editingSkill.id, payload);
        message.success('Skill 已更新');
      } else {
        await createSkill(payload);
        message.success('Skill 已创建');
      }
      setModalOpen(false);
      fetchSkills();
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSkill(id);
      message.success('已删除');
      fetchSkills();
    } catch {
      message.error('删除失败');
    }
  };

  const handleToggleEnabled = async (skill: SkillItem, enabled: boolean) => {
    try {
      await updateSkill(skill.id, { enabled });
      fetchSkills();
    } catch {
      message.error('操作失败');
    }
  };

  const openTest = (skill: SkillItem) => {
    setTestingSkill(skill);
    // 根据 inputSchema 生成示例 input
    try {
      const schema = JSON.parse(skill.inputSchema || '{}') as { properties?: Record<string, { type: string }> };
      if (schema.properties) {
        const example: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(schema.properties)) {
          example[k] = v.type === 'number' ? 0 : v.type === 'boolean' ? false : '';
        }
        setTestInput(JSON.stringify(example, null, 2));
      } else {
        setTestInput('{}');
      }
    } catch {
      setTestInput('{}');
    }
    setTestResult(null);
    setTestModalOpen(true);
  };

  const handleTest = async () => {
    if (!testingSkill) return;
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(testInput) as Record<string, unknown>; } catch {
      message.error('请输入合法的 JSON');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testSkill(testingSkill.id, parsed);
      setTestResult(JSON.stringify(result, null, 2));
    } catch {
      setTestResult('调用失败，请检查 Webhook 配置');
    } finally {
      setTesting(false);
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: SkillItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2, tooltip: text }} style={{ marginBottom: 0, maxWidth: 260 }}>
          {text}
        </Paragraph>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type: string) => <Tag icon={<ApiOutlined />} color="blue">{type}</Tag>,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean, record: SkillItem) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(val) => handleToggleEnabled(record, val)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: SkillItem) => (
        <Space>
          <Tooltip title="测试">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => openTest(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该 Skill？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<><ThunderboltOutlined /> 自定义 Skill</>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建 Skill
        </Button>
      }
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        通过 Webhook 为 AI 扩展自定义能力。启用后，AI 会根据 Skill 描述自动决定是否调用。
      </Paragraph>

      <Table
        rowKey="id"
        dataSource={skills}
        columns={columns}
        loading={loading}
        pagination={false}
        locale={{ emptyText: '暂无 Skill，点击「新建 Skill」开始创建' }}
      />

      {/* 创建/编辑 Modal */}
      <Modal
        title={editingSkill ? '编辑 Skill' : '新建 Skill'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label="Tool 名称"
            name="name"
            rules={[
              { required: true, message: '请输入名称' },
              { pattern: /^[a-z][a-z0-9_]*$/, message: '只允许小写字母、数字和下划线，且以字母开头' },
            ]}
            tooltip="snake_case，作为 AI 内部工具名，创建后不可修改"
          >
            <Input placeholder="例：get_weather" disabled={!!editingSkill} />
          </Form.Item>

          <Form.Item
            label="展示名称"
            name="displayName"
            rules={[{ required: true, message: '请输入展示名称' }]}
          >
            <Input placeholder="例：查询天气" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[{ required: true, message: '请输入描述' }]}
            tooltip="AI 根据此描述判断何时调用该 Skill，越详细越准确"
          >
            <TextArea
              rows={3}
              placeholder="例：查询指定城市的实时天气。适用于用户询问天气、温度、是否需要带伞等场景。"
            />
          </Form.Item>

          <Collapse
            ghost
            defaultActiveKey={['webhook']}
            items={[
              {
                key: 'webhook',
                label: 'Webhook 配置',
                children: (
                  <>
                    <Form.Item
                      label="Webhook URL"
                      name="webhookUrl"
                      rules={[{ required: true, message: '请输入 Webhook URL' }]}
                    >
                      <Input placeholder="https://example.com/webhook" />
                    </Form.Item>

                    <Space style={{ width: '100%' }} align="start">
                      <Form.Item label="请求方式" name="webhookMethod" style={{ minWidth: 120 }}>
                        <Select options={[
                          { value: 'POST', label: 'POST' },
                          { value: 'GET', label: 'GET' },
                          { value: 'PUT', label: 'PUT' },
                        ]} />
                      </Form.Item>
                      <Form.Item label="超时（秒）" name="webhookTimeout" style={{ flex: 1 }}>
                        <Input type="number" min={1} max={60} />
                      </Form.Item>
                    </Space>

                    <Form.Item
                      label="请求头（JSON，可选）"
                      name="webhookHeaders"
                      tooltip='例：{"Authorization": "Bearer token"}'
                    >
                      <TextArea rows={3} placeholder='{"Authorization": "Bearer your-token"}' />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'schema',
                label: '入参结构（JSON Schema，可选）',
                children: (
                  <Form.Item
                    name="inputSchema"
                    tooltip="定义 AI 调用时需要传递的参数结构，AI 会自动从对话中提取对应参数"
                  >
                    <TextArea
                      rows={6}
                      placeholder={`{\n  "properties": {\n    "city": { "type": "string", "description": "城市名称" }\n  },\n  "required": ["city"]\n}`}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </Form.Item>
                ),
              },
            ]}
          />

          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 测试 Modal */}
      <Modal
        title={`测试 Skill：${testingSkill?.displayName ?? ''}`}
        open={testModalOpen}
        onCancel={() => setTestModalOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setTestModalOpen(false)}>关闭</Button>
            <Button type="primary" loading={testing} icon={<PlayCircleOutlined />} onClick={handleTest}>
              发送请求
            </Button>
          </Space>
        }
        width={560}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label="输入参数（JSON）">
            <TextArea
              rows={6}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
          {testResult !== null && (
            <Form.Item label="响应结果">
              <TextArea
                rows={8}
                readOnly
                value={testResult}
                style={{ fontFamily: 'monospace', fontSize: 12, background: '#fafafa' }}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default SkillTab;
