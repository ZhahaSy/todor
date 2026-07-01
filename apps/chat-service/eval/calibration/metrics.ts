/**
 * 校准指标计算（纯函数，便于 selftest）。
 *
 * faithfulness 是二元判断（是否幻觉）→ 一致率 + 混淆矩阵 + Cohen's Kappa。
 * quality 是 1-5 序数分 → 平均绝对误差(MAE) + ±1 内吻合率 + 完全一致率。
 *
 * 为什么不止看"一致率"：二元判断里若两边都倾向同一答案，光看一致率会虚高。
 * Cohen's Kappa 扣除了"瞎猜也能蒙对"的部分，更能反映 judge 是否真的可信。
 */

/** 二元一致性：以 positive（此处=判定为"幻觉"）为正类 */
export interface BinaryAgreement {
  n: number;
  agreementRate: number; // 观测一致率 po
  kappa: number; // Cohen's Kappa
  /** 以"判为幻觉"为正类的混淆矩阵（human vs judge） */
  confusion: { tp: number; tn: number; fp: number; fn: number };
}

/**
 * @param pairs 每条样本的 (human, judge) 二元标签，true=正类（幻觉）
 */
export function binaryAgreement(
  pairs: { human: boolean; judge: boolean }[],
): BinaryAgreement {
  const n = pairs.length;
  let tp = 0,
    tn = 0,
    fp = 0,
    fn = 0;
  for (const { human, judge } of pairs) {
    if (human && judge) tp++;
    else if (!human && !judge) tn++;
    else if (!human && judge) fp++;
    else fn++; // human && !judge
  }
  const po = n === 0 ? 1 : (tp + tn) / n;

  // 偶然一致率 pe（基于各自的边际分布）
  const humanPos = (tp + fn) / n;
  const judgePos = (tp + fp) / n;
  const pe = humanPos * judgePos + (1 - humanPos) * (1 - judgePos);
  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);

  return {
    n,
    agreementRate: Number(po.toFixed(4)),
    kappa: Number(kappa.toFixed(4)),
    confusion: { tp, tn, fp, fn },
  };
}

/** 序数分（1-5）一致性 */
export interface OrdinalAgreement {
  n: number;
  mae: number; // 平均绝对误差
  exactRate: number; // 完全相等占比
  within1Rate: number; // 相差 ≤1 占比
  humanMean: number;
  judgeMean: number;
}

export function ordinalAgreement(
  pairs: { human: number; judge: number }[],
): OrdinalAgreement {
  const n = pairs.length;
  if (n === 0) {
    return { n: 0, mae: 0, exactRate: 1, within1Rate: 1, humanMean: 0, judgeMean: 0 };
  }
  let absErr = 0,
    exact = 0,
    within1 = 0,
    humanSum = 0,
    judgeSum = 0;
  for (const { human, judge } of pairs) {
    const diff = Math.abs(human - judge);
    absErr += diff;
    if (diff === 0) exact++;
    if (diff <= 1) within1++;
    humanSum += human;
    judgeSum += judge;
  }
  return {
    n,
    mae: Number((absErr / n).toFixed(3)),
    exactRate: Number((exact / n).toFixed(4)),
    within1Rate: Number((within1 / n).toFixed(4)),
    humanMean: Number((humanSum / n).toFixed(2)),
    judgeMean: Number((judgeSum / n).toFixed(2)),
  };
}

/** Kappa 的常用强度解读（Landis & Koch） */
export function kappaStrength(kappa: number): string {
  if (kappa < 0) return '比随机还差';
  if (kappa <= 0.2) return '极弱';
  if (kappa <= 0.4) return '一般';
  if (kappa <= 0.6) return '中等';
  if (kappa <= 0.8) return '较强';
  return '很强';
}
