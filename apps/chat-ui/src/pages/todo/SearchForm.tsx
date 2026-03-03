import { Form, FormProps, Segmented } from "antd";

import { Input } from "antd";

import { Button } from "antd";

import { SearchOutlined } from "@ant-design/icons";


const SearchForm = (props: FormProps) => {
  return (
    <Form {...props} >
      
      <Form.Item name="keyword">
        <Input.Search
          style={{ position: "sticky", top: 12, zIndex: 1 }}
          styles={{
            input: {
              height: "50px",
            },
            suffix: {
              height: "50px",
            },
          }}
          enterButton={
            <Button style={{ height: "50px", width: "50px" }}>
              <SearchOutlined />
            </Button>
          }
          placeholder="输入关键词"
        />
      </Form.Item>
      <Form.Item name='status'>
        <Segmented
          options={[
            {
              label: "未完成",
              value: "active",
            },
            {
              label: "已完成",
              value: "completed",
            },
          ]}
        />
      </Form.Item>
    </Form>
  );
};
export default SearchForm;
