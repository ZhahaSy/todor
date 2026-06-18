import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Button,
  message,
  Input,
  Descriptions,
  Tag,
  Space,
  Alert,
} from 'antd';
import { SafetyOutlined, SearchOutlined } from '@ant-design/icons';
import {
  getAiQuota,
  setAiQuota,
  getUserQuotaUsage,
  type AiQuotaUsage,
} from '@client/api';

const AdminQuota = () => {
  const [limit, setLimit] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // 查用户用量
  const [queryUserId, setQueryUserId] = useState('');
  const [usage, setUsage] = useState<AiQuotaUsage | null>(null);
  const [querying, setQuerying] = useState(false);

  const loadLimit = async () => {
    try {
      setLoading(true);
      const res = await getAiQuota();
      setLimit(res.limit);
      setEditValue(res.limit);
    } catch {
      message.error('读取配额失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLimit();
  }, []);

  const handleSave = async () => {
    if (editValue == null || editValue < 0 || !Number.isInteger(editValue)) {
      message.warning('请输入 >= 0 的整数');
      return;
    }
    try {
      setSaving(true);
      const res = await setAiQuota(editValue);
      setLimit(res.limit);
      message.success(
        res.limit === 0 ? '已设为不限制' : `每日上限已更新为 ${res.limit}`,
      );
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleQuery = async () => {
    const id = queryUserId.trim();
    if (!id) {
      message.warning('请输入用户 ID');
      return;
    }
    try {
      setQuerying(true);
      const res = await getUserQuotaUsage(id);
      setUsage(res);
    } catch {
      message.error('查询失败');
      setUsage(null);
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 720 }}>
        <Alert
          type="info"
          message="全局每日 AI 配额"
          description="限制单个用户每自然日可发起的 AI 对话次数，用于控制模型调用成本。0 表示不限制。修改后立即对后续请求生效，无需重启。白名单 / 管理员用户不受此限制。"
        />

        <Card
          title={
            <span>
              <SafetyOutlined /> 全局每日上限
            </span>
          }
          loading={loading}
        >
          <Form layout="inline">
            <Form.Item label="当前生效值">
              <Tag color={limit === 0 ? 'green' : 'blue'} style={{ fontSize: 14 }}>
                {limit === 0 ? '不限制' : `${limit ?? '-'} 次/天`}
              </Tag>
            </Form.Item>
          </Form>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <InputNumber
              min={0}
              step={10}
              precision={0}
              value={editValue}
              onChange={(v) => setEditValue(Number(v ?? 0))}
              style={{ width: 200 }}
              addonAfter="次/天"
            />
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存
            </Button>
            <span style={{ color: '#999' }}>填 0 表示不限制</span>
          </div>
        </Card>

        <Card
          title={
            <span>
              <SearchOutlined /> 查询用户用量
            </span>
          }
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <Input
              placeholder="输入用户 ID"
              value={queryUserId}
              onChange={(e) => setQueryUserId(e.target.value)}
              onPressEnter={handleQuery}
              allowClear
              style={{ maxWidth: 360 }}
            />
            <Button loading={querying} onClick={handleQuery}>
              查询
            </Button>
          </div>
          {usage && (
            <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="今日已用">{usage.used} 次</Descriptions.Item>
              <Descriptions.Item label="当前上限">
                {usage.limit === 0 ? '不限制' : `${usage.limit} 次/天`}
              </Descriptions.Item>
              <Descriptions.Item label="白名单">
                {usage.whitelisted ? (
                  <Tag color="green">是（不受限）</Tag>
                ) : (
                  <Tag>否</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default AdminQuota;
