/**
 * 校准主脚本：量化 LLM-judge 与人工金标准的一致性。
 *
 * 用法：pnpm eval:calib:run
 * 前置：dataset.json（冻结样本）+ gold.json（人复核的金标准；缺失则回退 predraft 并警告）。
 *
 * 流程：对每条冻结样本，让 judge 重判 K 次（faithfulness 取多数票、quality 取均值），
 * 与金标准比对，算 binary/ordinal 一致性指标，输出 report.md 并列出所有人机分歧样本。
 *
 * 注意：只重跑 judge，不重跑 agent —— 样本是冻结的，保证校准有稳定对照。
 */

import * as fs from 'fs';
import * as path from 'path';
import { judgeFaithfulness, judgeQuality } from '../scorers/llm-judge';
import {
  binaryAgreement,
  ordinalAgreement,
  kappaStrength,
} from './metrics';
import type { CalibrationSample, GoldLabel } from './types';

const K = 3; // 每条样本 judge 重判次数

function load<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf-8')) as T;
}

function majority(bools: boolean[]): boolean {
  const t = bools.filter(Boolean).length;
  return t > bools.length / 2;
}
const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

interface JudgedSample {
  id: string;
  input: string;
  finalText: string;
  // faithfulness
  goldHallucinated?: boolean;
  judgeHallucinated?: boolean;
  judgeHalVotes?: boolean[];
  // quality
  goldScore?: number;
  judgeScore?: number;
  judgeScoreSamples?: number[];
}

async function judgeOne(
  sample: CalibrationSample,
  gold: GoldLabel,
): Promise<JudgedSample> {
  const out: JudgedSample = {
    id: sample.id,
    input: sample.input,
    finalText: sample.finalText,
  };

  if (sample.dimensions.includes('faithfulness') && gold.faithfulness) {
    const votes: boolean[] = [];
    for (let i = 0; i < K; i++) {
      try {
        const r = await judgeFaithfulness(
          sample.input,
          sample.finalText,
          sample.toolData,
        );
        votes.push(r.hallucinated);
      } catch (e) {
        console.warn(`    ⚠️ ${sample.id} faithfulness judge 第${i + 1}次失败，跳过`);
      }
    }
    if (votes.length) {
      out.goldHallucinated = gold.faithfulness.hallucinated;
      out.judgeHallucinated = majority(votes);
      out.judgeHalVotes = votes;
    }
  }

  if (sample.dimensions.includes('quality') && gold.quality && sample.rubric) {
    const scores: number[] = [];
    for (let i = 0; i < K; i++) {
      try {
        const r = await judgeQuality(sample.input, sample.finalText, sample.rubric);
        scores.push(r.score);
      } catch (e) {
        console.warn(`    ⚠️ ${sample.id} quality judge 第${i + 1}次失败，跳过`);
      }
    }
    if (scores.length) {
      out.goldScore = gold.quality.score;
      out.judgeScore = Math.round(mean(scores));
      out.judgeScoreSamples = scores;
    }
  }

  return out;
}

function writeReport(
  judged: JudgedSample[],
  meta: { goldFile: string; allVerified: boolean },
) {
  const faithPairs = judged
    .filter((j) => j.goldHallucinated !== undefined)
    .map((j) => ({ human: j.goldHallucinated!, judge: j.judgeHallucinated! }));
  const qualPairs = judged
    .filter((j) => j.goldScore !== undefined)
    .map((j) => ({ human: j.goldScore!, judge: j.judgeScore! }));

  const fa = binaryAgreement(faithPairs);
  const qa = ordinalAgreement(qualPairs);

  // 分歧样本
  const faithDisagree = judged.filter(
    (j) => j.goldHallucinated !== undefined && j.goldHallucinated !== j.judgeHallucinated,
  );
  const qualDisagree = judged.filter(
    (j) => j.goldScore !== undefined && Math.abs(j.goldScore - j.judgeScore!) >= 2,
  );

  const L: string[] = [];
  L.push('# LLM-judge 校准报告\n');
  if (!meta.allVerified) {
    L.push(
      `> ⚠️ 本次金标准来自 \`${meta.goldFile}\`，**尚未全部人工复核**，结论仅供参考。\n`,
    );
  }
  L.push(`金标准来源：\`${meta.goldFile}\` | judge 每样本重判 ${K} 次\n`);

  L.push('## Faithfulness（是否幻觉，二元）\n');
  L.push(`- 样本数：${fa.n}`);
  L.push(`- 人机一致率：${(fa.agreementRate * 100).toFixed(1)}%`);
  L.push(`- Cohen's Kappa：${fa.kappa}（${kappaStrength(fa.kappa)}）`);
  L.push(
    `- 混淆矩阵（以"判为幻觉"为正类）：TP=${fa.confusion.tp} TN=${fa.confusion.tn} FP=${fa.confusion.fp} FN=${fa.confusion.fn}`,
  );
  L.push(`  - FP=judge误报幻觉（人说没有）、FN=judge漏报（人说有但judge没抓到）\n`);

  L.push('## Quality（1-5 分，序数）\n');
  L.push(`- 样本数：${qa.n}`);
  L.push(`- 人均分 ${qa.humanMean} vs judge 均分 ${qa.judgeMean}`);
  L.push(`- 平均绝对误差(MAE)：${qa.mae}`);
  L.push(`- 完全一致率：${(qa.exactRate * 100).toFixed(1)}%`);
  L.push(`- ±1 分内吻合率：${(qa.within1Rate * 100).toFixed(1)}%\n`);

  L.push('## 人机分歧样本\n');
  if (faithDisagree.length === 0 && qualDisagree.length === 0) {
    L.push('无显著分歧。\n');
  } else {
    for (const j of faithDisagree) {
      L.push(
        `- [faithfulness] \`${j.id}\` 人=${j.goldHallucinated ? '幻觉' : '正常'} judge=${j.judgeHallucinated ? '幻觉' : '正常'}（票:${JSON.stringify(j.judgeHalVotes)}）`,
      );
      L.push(`  - 输入：${j.input}`);
      L.push(`  - 回复：${j.finalText.slice(0, 80)}`);
    }
    for (const j of qualDisagree) {
      L.push(
        `- [quality] \`${j.id}\` 人=${j.goldScore} judge=${j.judgeScore}（采样:${JSON.stringify(j.judgeScoreSamples)}）`,
      );
      L.push(`  - 回复：${j.finalText.slice(0, 80)}`);
    }
    L.push('');
  }

  const report = L.join('\n');
  console.log('\n' + report);
  const outPath = path.join(__dirname, 'report.md');
  fs.writeFileSync(outPath, report, 'utf-8');
  console.log(`\n报告已保存：${outPath}`);
}

async function main() {
  const dataset = load<CalibrationSample[]>('dataset.json');

  // 优先用人复核的 gold.json；没有则回退预标并警告
  let goldFile = 'gold.json';
  if (!fs.existsSync(path.join(__dirname, 'gold.json'))) {
    goldFile = 'gold.predraft.json';
    console.warn(
      '⚠️ 未找到 gold.json（人复核的金标准），回退用 gold.predraft.json（助手预标）。',
    );
    console.warn('   正式校准请先复核预标、存为 gold.json。\n');
  }
  const golds = load<GoldLabel[]>(goldFile);
  const goldMap = new Map(golds.map((g) => [g.id, g]));
  const allVerified = golds.every((g) => g.humanVerified);

  console.log(`校准开始：${dataset.length} 条样本 × judge 重判 ${K} 次\n`);

  const judged: JudgedSample[] = [];
  for (const sample of dataset) {
    const gold = goldMap.get(sample.id);
    if (!gold) {
      console.warn(`    ⚠️ ${sample.id} 无金标准，跳过`);
      continue;
    }
    process.stdout.write(`  [${sample.id}] judging...`);
    judged.push(await judgeOne(sample, gold));
    process.stdout.write(' done\n');
  }

  writeReport(judged, { goldFile, allVerified });
}

main().catch((e) => {
  console.error('校准失败：', e);
  process.exit(1);
});


