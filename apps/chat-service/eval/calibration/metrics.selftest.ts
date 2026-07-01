/**
 * 校准指标的离线自检（不打模型）。
 * 用手算可验证的小例子，确认一致率/Kappa/MAE 计算正确。
 *
 * 跑：pnpm eval:calib:selftest
 */

import {
  binaryAgreement,
  ordinalAgreement,
  kappaStrength,
} from './metrics';

let passed = 0;
let failed = 0;
function assert(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}  ${detail}`);
  }
}
const approx = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

console.log('\n=== 校准指标自检 ===\n');

console.log('binaryAgreement:');
{
  // 完全一致：全 TN
  const r = binaryAgreement([
    { human: false, judge: false },
    { human: false, judge: false },
  ]);
  assert('全一致 → 一致率 1', r.agreementRate === 1);
  assert('全一致同标签 → kappa 1', r.kappa === 1, `kappa=${r.kappa}`);
}
{
  // 混淆矩阵：1 TP, 1 TN, 1 FP, 1 FN
  const r = binaryAgreement([
    { human: true, judge: true }, // tp
    { human: false, judge: false }, // tn
    { human: false, judge: true }, // fp
    { human: true, judge: false }, // fn
  ]);
  assert('混淆矩阵正确', r.confusion.tp === 1 && r.confusion.tn === 1 && r.confusion.fp === 1 && r.confusion.fn === 1);
  assert('一致率 0.5', r.agreementRate === 0.5);
  assert('此对称情形 kappa=0', approx(r.kappa, 0), `kappa=${r.kappa}`);
}
{
  // judge 系统性漏报正类（FN 多）—— 模拟"幻觉没抓到"
  const r = binaryAgreement([
    { human: true, judge: false },
    { human: true, judge: false },
    { human: false, judge: false },
    { human: false, judge: false },
  ]);
  assert('漏报情形一致率 0.5', r.agreementRate === 0.5);
  assert('漏报 fn=2', r.confusion.fn === 2);
}

console.log('ordinalAgreement:');
{
  const r = ordinalAgreement([
    { human: 5, judge: 5 },
    { human: 5, judge: 4 },
    { human: 3, judge: 5 },
  ]);
  assert('MAE = (0+1+2)/3 = 1', approx(r.mae, 1), `mae=${r.mae}`);
  assert('完全一致率 1/3', approx(r.exactRate, 0.3333), `exact=${r.exactRate}`);
  assert('±1 吻合率 2/3', approx(r.within1Rate, 0.6667), `within1=${r.within1Rate}`);
  assert('human 均值 4.33', approx(r.humanMean, 4.33), `hm=${r.humanMean}`);
}
{
  const r = ordinalAgreement([]);
  assert('空集不报错', r.n === 0);
}

console.log('kappaStrength:');
{
  assert('0.85 → 很强', kappaStrength(0.85) === '很强');
  assert('0.5 → 中等', kappaStrength(0.5) === '中等');
  assert('负数 → 比随机还差', kappaStrength(-0.1) === '比随机还差');
}

console.log(`\n结果：${passed} 通过，${failed} 失败\n`);
process.exit(failed === 0 ? 0 : 1);
