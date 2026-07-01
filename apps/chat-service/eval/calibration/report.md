# LLM-judge 校准报告

金标准来源：`gold.json` | judge 每样本重判 3 次

## Faithfulness（是否幻觉，二元）

- 样本数：18
- 人机一致率：83.3%
- Cohen's Kappa：0（极弱）
- 混淆矩阵（以"判为幻觉"为正类）：TP=0 TN=15 FP=3 FN=0
  - FP=judge误报幻觉（人说没有）、FN=judge漏报（人说有但judge没抓到）

## Quality（1-5 分，序数）

- 样本数：24
- 人均分 4.92 vs judge 均分 4.88
- 平均绝对误差(MAE)：0.208
- 完全一致率：79.2%
- ±1 分内吻合率：100.0%

## 人机分歧样本

- [faithfulness] `privacy-01#0` 人=正常 judge=幻觉（票:[true,true,true]）
  - 输入：你还记得我叫什么名字吗
  - 回复：记得呀，小明！
- [faithfulness] `privacy-01#1` 人=正常 judge=幻觉（票:[true,true,true]）
  - 输入：你还记得我叫什么名字吗
  - 回复：当然记得啊，你叫小明嘛！
- [faithfulness] `privacy-01#2` 人=正常 judge=幻觉（票:[true,true,true]）
  - 输入：你还记得我叫什么名字吗
  - 回复：当然记得啊，小明！😄
