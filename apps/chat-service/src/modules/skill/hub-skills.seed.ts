export interface HubSkillSeed {
  name: string;
  displayName: string;
  description: string;
  category: string;
  tags: string;
  triggerKeywords: string;
  config: string;
  inputSchema: string;
}

export const HUB_SKILLS: HubSkillSeed[] = [
  {
    name: 'query_ip_location',
    displayName: 'IP 归属地查询',
    description: '根据 IP 地址查询其归属地信息，包括国家、城市、ISP 等',
    category: '工具',
    tags: JSON.stringify(['IP', '网络', '地理位置']),
    triggerKeywords: JSON.stringify(['IP归属', 'IP地址', '查IP']),
    config: JSON.stringify({ url: 'https://ip-api.com/json/{ip}?lang=zh-CN', method: 'GET' }),
    inputSchema: JSON.stringify({
      properties: {
        ip: { type: 'string', description: '要查询的 IP 地址，留空则查询当前 IP' },
      },
      required: ['ip'],
    }),
  },
  {
    name: 'query_weather',
    displayName: '实时天气查询',
    description: '查询指定城市的实时天气状况，包括温度、湿度、天气描述等',
    category: '资讯',
    tags: JSON.stringify(['天气', '气象', '实时']),
    triggerKeywords: JSON.stringify(['天气', '气温', '下雨']),
    config: JSON.stringify({ url: 'https://wttr.in/{city}?format=j1', method: 'GET' }),
    inputSchema: JSON.stringify({
      properties: {
        city: { type: 'string', description: '城市名称，支持中英文，如 Beijing 或 北京' },
      },
      required: ['city'],
    }),
  },
  {
    name: 'translate_text',
    displayName: '文本翻译',
    description: '将文本从一种语言翻译为另一种语言，支持多语言互译',
    category: '文案',
    tags: JSON.stringify(['翻译', '语言', '多语言']),
    triggerKeywords: JSON.stringify(['翻译', 'translate', '用英文说']),
    config: JSON.stringify({
      url: 'https://api.mymemory.translated.net/get?q={text}&langpair={from}|{to}',
      method: 'GET',
    }),
    inputSchema: JSON.stringify({
      properties: {
        text: { type: 'string', description: '要翻译的文本' },
        from: { type: 'string', description: '源语言代码，如 zh（中文）、en（英文）' },
        to: { type: 'string', description: '目标语言代码，如 en（英文）、ja（日文）' },
      },
      required: ['text', 'from', 'to'],
    }),
  },
  {
    name: 'query_exchange_rate',
    displayName: '汇率查询',
    description: '查询指定货币相对其他货币的最新汇率',
    category: '资讯',
    tags: JSON.stringify(['汇率', '货币', '外汇']),
    triggerKeywords: JSON.stringify(['汇率', '换算', '美元', '人民币']),
    config: JSON.stringify({
      url: 'https://api.exchangerate-open.com/v6/latest?base={base}',
      method: 'GET',
    }),
    inputSchema: JSON.stringify({
      properties: {
        base: { type: 'string', description: '基准货币代码，如 USD、CNY、EUR' },
      },
      required: ['base'],
    }),
  },
  {
    name: 'get_random_quote',
    displayName: '每日名言',
    description: '随机获取一条励志名言或格言，支持按标签筛选',
    category: '生活',
    tags: JSON.stringify(['名言', '励志', '格言']),
    triggerKeywords: JSON.stringify(['名言', '格言', '励志句子', '每日一言']),
    config: JSON.stringify({ url: 'https://api.quotable.io/random?tags={tags}', method: 'GET' }),
    inputSchema: JSON.stringify({
      properties: {
        tags: {
          type: 'string',
          description: '标签筛选，如 inspirational、success、wisdom，多个用逗号分隔，留空随机',
        },
      },
      required: [],
    }),
  },
  {
    name: 'generate_qr_code',
    displayName: '二维码生成',
    description: '将任意文本或 URL 生成二维码图片链接',
    category: '工具',
    tags: JSON.stringify(['二维码', 'QR', '图片']),
    triggerKeywords: JSON.stringify(['二维码', 'QR码', '生成二维码']),
    config: JSON.stringify({
      url: 'https://api.qrserver.com/v1/create-qr-code/?data={content}&size=300x300',
      method: 'GET',
    }),
    inputSchema: JSON.stringify({
      properties: {
        content: { type: 'string', description: '要编码为二维码的文本或 URL' },
      },
      required: ['content'],
    }),
  },
];
