import { Tag } from "antd";

const levelMap = {
  high: {
    color: "red",
    text: "紧急",
  },
  medium: {
    color: "orange",
    text: "重要",
  },
  low: {
    color: "blue",
    text: "普通",
  },
};

const LevelTag = ({ level }: { level: "high" | "medium" | "low" }) => {
  const curLevel = levelMap[level];
  return <Tag color={curLevel.color}>{curLevel.text}</Tag>;
};
export default LevelTag;
