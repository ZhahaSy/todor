import { useState, useEffect, useMemo } from 'react';
import {
  Input,
  Radio,
  List,
  Card,
  Tag,
  Button,
  Popconfirm,
  message,
  Typography,
  Space,
  Spin,
} from 'antd';
import type { RadioChangeEvent } from 'antd';
import {
  getHubSkillList,
  installHubSkill,
  uninstallHubSkill,
  type HubSkillItem,
} from '@client/api';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const CATEGORIES = ['全部', '工具', '资讯', '文案', '生活', '开发'];

const CATEGORY_COLORS: Record<string, string> = {
  工具: 'blue',
  资讯: 'orange',
  文案: 'purple',
  生活: 'green',
  开发: 'cyan',
};

const SkillHubPage = () => {
  const [skills, setSkills] = useState<HubSkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('全部');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await getHubSkillList();
      setSkills(data);
    } catch {
      message.error('加载技能库失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSkills();
  }, []);

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      const matchCategory = category === '全部' || s.category === category;
      const keyword = searchText.toLowerCase();
      const matchSearch =
        !keyword ||
        s.displayName.toLowerCase().includes(keyword) ||
        s.description.toLowerCase().includes(keyword);
      return matchCategory && matchSearch;
    });
  }, [skills, category, searchText]);

  const handleInstall = async (hubId: string) => {
    setActionLoading(hubId);
    try {
      await installHubSkill(hubId);
      message.success('安装成功，下次对话即可使用');
      await loadSkills();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '安装失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (hubId: string) => {
    setActionLoading(hubId);
    try {
      await uninstallHubSkill(hubId);
      message.success('已卸载');
      await loadSkills();
    } catch {
      message.error('卸载失败');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 8 }}>技能库</Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          浏览官方预置技能，一键安装后即可在对话中使用
        </Paragraph>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Search
          placeholder="搜索技能名称或描述"
          allowClear
          style={{ maxWidth: 400 }}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={setSearchText}
        />

        <Radio.Group
          value={category}
          onChange={(e: RadioChangeEvent) => setCategory(e.target.value as string)}
        >
          {CATEGORIES.map((c) => (
            <Radio.Button key={c} value={c}>{c}</Radio.Button>
          ))}
        </Radio.Group>

        <Spin spinning={loading}>
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 3 }}
            dataSource={filtered}
            locale={{ emptyText: '暂无匹配技能' }}
            renderItem={(item) => (
              <List.Item>
                <Card
                  size="small"
                  title={
                    <Space>
                      <span>{item.displayName}</span>
                      <Tag color={CATEGORY_COLORS[item.category] ?? 'default'} style={{ marginInlineEnd: 0 }}>
                        {item.category}
                      </Tag>
                    </Space>
                  }
                  extra={
                    item.installedId ? (
                      <Tag color="success">已安装</Tag>
                    ) : null
                  }
                  actions={[
                    item.installedId ? (
                      <Popconfirm
                        key="uninstall"
                        title="确认卸载该技能？"
                        onConfirm={() => handleUninstall(item.id)}
                        okText="卸载"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          loading={actionLoading === item.id}
                        >
                          卸载
                        </Button>
                      </Popconfirm>
                    ) : (
                      <Button
                        key="install"
                        type="primary"
                        size="small"
                        loading={actionLoading === item.id}
                        onClick={() => handleInstall(item.id)}
                      >
                        安装
                      </Button>
                    ),
                  ]}
                >
                  <Paragraph
                    ellipsis={{ rows: 2, tooltip: item.description }}
                    style={{ minHeight: 40, marginBottom: 8 }}
                  >
                    {item.description}
                  </Paragraph>
                  <Space size={4} wrap>
                    {item.tags.map((tag) => (
                      <Tag key={tag} style={{ marginInlineEnd: 0 }}>{tag}</Tag>
                    ))}
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        </Spin>
      </Space>
    </div>
  );
};

export default SkillHubPage;
