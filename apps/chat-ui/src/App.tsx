import React, { useEffect, useState } from "react";
import { Flex, GetProp, message, Typography } from "antd";
import { Bubble, BubbleProps, Sender } from "@ant-design/x";
import { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";

import * as aiService from "ai-service";
import "./App.css";
import {
  addChatRecord,
  getChatRecord,
  HistRecordItem,
} from "./api/ConversationsAPI";
import markdownit from 'markdown-it';

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
    styles: {
      content: {
        borderRadius: 16,
        background: "yellowGreen",
      },
    },
  },
};

const md = markdownit({ html: true, breaks: true });


const renderMarkdown: BubbleProps['messageRender'] = (content) => (
  <Typography>
    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
    <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
  </Typography>
);

const Demo: React.FC = () => {
  const [histChatList, setHistChatList] = useState<BubbleDataType[]>([]);

  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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

  const getChatList = async () => {
    const data: HistRecordItem[] = await getChatRecord();
    setHistChatList(
      data?.map(({ id, content, user }) => {
        return {
          id,
          content,
          role: user,
          messageRender: renderMarkdown,
        };
      })
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    handleAsk(value)
    await addChatRecord({
      user: "local",
      content: value,
      date: Date.now(),
    });
    setLoading(false);
    setValue("");
    getChatList();
  };

  const handleAsk = async (value:string) => {
    const aiMsg = await aiService.sendMessage(value);

    await addChatRecord({
      user: "ai",
      content: aiMsg.content,
      date: Date.now(),
    });
    getChatList();
  }

  useEffect(() => {
    getChatList();
  }, []);

  return (
    <div className="chat-wrapper">
      <Flex gap="middle" vertical className="chat-list">
        <Bubble.List items={histChatList}  roles={roles} />
      </Flex>
      <Sender
        className="sender"
        loading={loading}
        value={value}
        onChange={(v) => {
          setValue(v);
        }}
        onSubmit={() => {
          handleSubmit();
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
