import { Select, SelectProps } from "antd";
import { FC } from "react";

const TypeSelector: FC<Omit<SelectProps, 'options'>> = (props) => {
  return (
    <Select
      mode="multiple"
      defaultValue={["all"]}
      options={[
        {
          label: "全部",
          value: "all",
        },
        {
          label: "工作",
          value: "work",
        },
        {
          label: "学习",
          value: "study",
        },
        {
          label: "生活",
          value: "life",
        },
      ]}
      {...props}
    />
  );
};

export default TypeSelector;
