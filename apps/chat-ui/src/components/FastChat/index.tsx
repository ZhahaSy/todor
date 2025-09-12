import { Flex, FloatButton, Modal } from "antd";

import { useRef, useState } from "react";

import { useDrag } from "ahooks";

import { FloatButtonElement } from "antd/es/float-button/interface";
import { MessageFilled } from "@ant-design/icons";
import { Bubble, Sender } from "@ant-design/x";
import { SenderPanel } from "@client/ui";
import { useSendMessage } from "@client/hooks";

const FastChat = () => {
  const [open, setOpen] = useState(false);

  const dragRef = useRef<FloatButtonElement>(null);

  const [position, setPosition] = useState<{
    left: number | string;
    bottom?: number | string;
    top?: number | string;
  }>({
    left: 80,
    bottom: "20%",
  });

  const onDrag = (e) => {
    console.log(e);

    setPosition({
      left: e.pageX + "px",
      top: e.pageY + "px",
    });
  };

  const [content, setContent] = useState("");

  const { handleSubmit, handleCancel, loading } = useSendMessage(
    (content, type) => {
      if (type === "local") return;
      setContent(content);
    }
  );

  return (
    <>
      <FloatButton
        ref={dragRef}
        onClick={() => {
          setOpen((preState) => !preState);
        }}
        icon={null}
        style={{
          width: 40,
          height: 40,
          ...position,
          // 禁用拖拽回弹效果
          transition: "none",
          transform: "none",
        }}
        draggable
        onDragEnd={onDrag}
        description={<MessageFilled />}
      ></FloatButton>
      <Modal
        styles={{
          content: {
            background: "rgba(0,0,0,0)",
            boxShadow: "none",
            height: "900px",
            minWidth: "80%",
          },
        }}
        maskClosable
        onClose={() => {
          setOpen(false);
        }}
        onCancel={() => {
          setOpen(false);
        }}
        open={open}
        centered
        closable={false}
        footer={null}
        width={"80%"}
      >
        <Flex vertical gap={20}>
          <SenderPanel
            onSubmit={handleSubmit}
            sending={loading}
            onCancel={handleCancel}
          />
          {content && (
            <Bubble style={{ background: "#f2f3f4" }} content={content} />
          )}
        </Flex>
      </Modal>
    </>
  );
};
export default FastChat;
