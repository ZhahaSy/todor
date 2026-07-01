import { extractWithModel } from './memory-extractor.service';

/**
 * 抽取器解析/兜底单测（mock model，不打真模型）。
 * 真模型的分类准确率由 `pnpm eval:memory` 验证，这里只测"解析是否健壮"。
 * 抽取器返回事实数组（一句话 0~N 条）。
 */
describe('extractWithModel 解析与兜底', () => {
  const fakeModel = (content: string) =>
    ({ invoke: async () => ({ content }) }) as any;

  it('正常 JSON 数组：解析出多条事实', async () => {
    const out = await extractWithModel(
      fakeModel(
        '[{"value":"high","confidence":"stated","category":"profile_extra","subject":"self","content":"程序员","source":"x","routeToUserField":"job"},{"value":"high","confidence":"stated","category":"health","subject":"self","content":"对海鲜过敏","source":"x","routeToUserField":null}]',
      ),
      '我是程序员，对海鲜过敏',
    );
    expect(out).toHaveLength(2);
    expect(out[0].routeToUserField).toBe('job');
    expect(out[1].category).toBe('health');
  });

  it('空数组：不记任何东西', async () => {
    const out = await extractWithModel(fakeModel('[]'), '今天好累');
    expect(out).toHaveLength(0);
  });

  it('被 ```json 包裹也能解析', async () => {
    const out = await extractWithModel(
      fakeModel('```json\n[{"content":"对花生过敏","confidence":"stated"}]\n```'),
      '我对花生过敏',
    );
    expect(out).toHaveLength(1);
    expect(out[0].confidence).toBe('stated');
  });

  it('非数组/非法输出：兜底为空数组（保守，宁漏勿错）', async () => {
    expect(await extractWithModel(fakeModel('我不知道'), 'xxx')).toHaveLength(0);
    expect(await extractWithModel(fakeModel('{"content":"x"}'), 'xxx')).toHaveLength(0);
  });

  it('过滤掉没有 content 的脏元素', async () => {
    const out = await extractWithModel(
      fakeModel('[{"content":"有效"},{"value":"high"},{"content":""}]'),
      'xxx',
    );
    expect(out).toHaveLength(1);
    expect(out[0].content).toBe('有效');
  });

  it('模型抛错：兜底空数组不崩', async () => {
    const errModel = { invoke: async () => { throw new Error('boom'); } } as any;
    expect(await extractWithModel(errModel, 'xxx')).toHaveLength(0);
  });

  it('缺省字段用默认值补全', async () => {
    const out = await extractWithModel(
      fakeModel('[{"content":"喜欢爬山"}]'),
      '我喜欢爬山',
    );
    expect(out[0].value).toBe('medium'); // FIELD_DEFAULTS
    expect(out[0].confidence).toBe('inferred');
    expect(out[0].source).toBe('我喜欢爬山'); // 缺 source 用 input
  });
});
