import React, { useState } from "react";
import { App, Flex, GetProp } from "antd";
import { Bubble, Sender } from "@ant-design/x";
import { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";

import './App.css';

const roles: GetProp<typeof Bubble.List, "roles"> = {
  ai: {
    placement: "start",
    typing: { step: 5, interval: 20 },
    styles: {
      content: {
        borderRadius: 16,
      },
    },
  },
  local: {
    placement: "end",
    variant: "shadow",
  },
};

const Demo: React.FC = () => {
  const histChatList: BubbleDataType[] = [];

  const [value, setValue] = useState<string>("Hello? this is X!");
  const [loading, setLoading] = useState<boolean>(false);

  const { message } = App.useApp();

  // Mock send message
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        message.success("Send message successfully!");
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [loading]);

  return (
    <div className="chat-wrapper">
      <Flex gap="middle" vertical className="chat-list">
        <Bubble.List items={histChatList} roles={roles} />
      </Flex>
      <Sender
        className="sender"
        loading={loading}
        value={value}
        onChange={(v) => {
          setValue(v);
        }}
        onSubmit={() => {
          setValue("");
          setLoading(true);
          message.info("Send message!");
        }}
        onCancel={() => {
          setLoading(false);
          message.error("Cancel sending!");
        }}
        autoSize={{ minRows: 2, maxRows: 6 }}
      />
    </div>
  );
};

export default Demo;
