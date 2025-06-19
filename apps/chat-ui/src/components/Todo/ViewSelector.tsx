import { Select, SelectProps } from "antd";
import { FC } from "react";

const ViewSelector: FC<Omit<SelectProps, 'options'>> = (props) => {
  return (
    <Select
      options={[
        {
            label: "日历视图",
            value: "calendar",
          },
        {
          label: "卡片视图",
          value: "card",
        },
      ]}
      {...props}
    />
  );
};

export default ViewSelector;
