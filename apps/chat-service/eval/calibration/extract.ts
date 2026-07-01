/**
 * 从最新的 eval 报告里抽取、冻结校准样本集。
 *
 * 用法：pnpm eval:calib:extract
 * 产物：eval/calibration/dataset.json（一旦生成就视为不可变的"考卷"）
 *
 * 抽取规则：报告 details 里凡有 faithfulness 或 quality 判定的运行，都取其
 * (input, finalText, toolData) 固化为一条样本，并记录它该参与哪些维度校准。
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CalibrationSample } from './types';
import type { EvalCase } from '../types';
import {
  weatherToolMock,
  databaseQueryToolMock,
  createReminderToolMock,
} from '../mocks';

function latestReport(): string {
  const dir = path.join(__dirname, '..', 'reports');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  if (files.length === 0) throw new Error('没有报告，先跑 pnpm eval');
  return path.join(dir, files[files.length - 1]);
}

/** 报告只存了用例 desc，没存真实 input/rubric —— 从用例文件按 caseId 补回 */
function loadCaseMap(): Map<string, EvalCase> {
  const file = path.join(__dirname, '..', 'cases', 'agent.cases.json');
  const cases = JSON.parse(fs.readFileSync(file, 'utf-8')) as EvalCase[];
  return new Map(cases.map((c) => [c.id, c]));
}

/**
 * 工具返回数据是 faithfulness 判断的事实依据。
 * 新报告 details.toolCalls[].result 已存；旧报告没存 —— 因 mock 返回固定，按工具名回填桩文本。
 */
async function toolResultText(name: string, storedResult?: string): Promise<string> {
  if (storedResult) return storedResult;
  const mocks: Record<string, any> = {
    weather_query: weatherToolMock,
    database_query: databaseQueryToolMock,
    create_reminder: createReminderToolMock,
  };
  const m = mocks[name];
  if (!m) return `${name}(返回未知)`;
  return (await m.bindUser().invoke({})) as string;
}

async function main() {
  const reportPath = latestReport();
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const caseMap = loadCaseMap();

  const samples: CalibrationSample[] = [];
  for (const rep of report.reports) {
    const evalCase = caseMap.get(rep.id);
    for (let i = 0; i < rep.details.length; i++) {
      const d = rep.details[i];
      const dimensions: Array<'faithfulness' | 'quality'> = [];
      if (d.faithfulness) dimensions.push('faithfulness');
      if (d.quality) dimensions.push('quality');
      if (dimensions.length === 0) continue;

      const toolData: string[] = [];
      for (const t of d.toolCalls ?? []) {
        toolData.push(await toolResultText(t.name, t.result));
      }

      samples.push({
        id: `${rep.id}#${i}`,
        caseId: rep.id,
        input: evalCase?.input ?? '(用例已删除，input 缺失)',
        finalText: d.finalText ?? '',
        toolData,
        rubric: evalCase?.expect.rubric,
        dimensions,
      });
    }
  }

  const outPath = path.join(__dirname, 'dataset.json');
  if (fs.existsSync(outPath)) {
    console.log(`⚠️ dataset.json 已存在，跳过覆盖（校准集应冻结不变）。`);
    console.log(`   如确需重建，先手动删除：${outPath}`);
    return;
  }
  fs.writeFileSync(outPath, JSON.stringify(samples, null, 2), 'utf-8');

  const faith = samples.filter((s) => s.dimensions.includes('faithfulness')).length;
  const qual = samples.filter((s) => s.dimensions.includes('quality')).length;
  console.log(`从 ${path.basename(reportPath)} 抽取：`);
  console.log(`  样本总数: ${samples.length}`);
  console.log(`  参与 faithfulness 校准: ${faith}`);
  console.log(`  参与 quality 校准: ${qual}`);
  console.log(`已冻结到: ${outPath}`);
}

main().catch((e) => {
  console.error('extract 失败：', e);
  process.exit(1);
});
