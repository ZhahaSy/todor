import { Tag } from "antd";

const typeMap = {
  work: {
    color: "red",
    text: "工作",
  },
  life: {
    color: "orange",
    text: "生活",
  },
  study: {
    color: "blue",
    text: "学习",
  },
};

const TypeTag = ({ type }: { type:  "work" | "life" | "study" }) => {
  const curType = typeMap[type];
  return <Tag color={curType.color}>{curType.text}</Tag>;
};
export default TypeTag;
