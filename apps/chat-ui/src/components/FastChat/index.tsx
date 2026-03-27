import { Flex, FloatButton, Modal } from "antd";

import { DragEventHandler, useRef, useState } from "react";

import { FloatButtonElement } from "antd/es/float-button/interface";
import { MessageFilled } from "@ant-design/icons";
import { Bubble } from "@ant-design/x";
import { SenderPanel } from "@client/ui";
import { useSendMessage } from "@client/hooks";

const FastChat = () => {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setContent("");
  };

  const dragRef = useRef<FloatButtonElement>(null);

  const [position, setPosition] = useState<{
    left: number | string;
    bottom?: number | string;
    top?: number | string;
  }>({
    left: 80,
    bottom: "20%",
  });

  const onDrag: DragEventHandler<FloatButtonElement> = (e) => {
    setPosition({
      left: e.pageX + "px",
      top: e.pageY + "px",
    });
  };

  const [content, setContent] = useState("");

  const { handleSubmit, handleCancel, loading } = useSendMessage(
    async (message) => {
      if (message.role === "local") return false;
      setContent(message.content);
      return true;
    }
  );

  return (
    <>
      <FloatButton
        ref={dragRef}
        onClick={() => {
          setOpen((preState) => !preState);
        }}
        icon={<MessageFilled />}
        style={{
          width: 40,
          height: 40,
          ...position,
          transition: "none",
          transform: "none",
        }}
        onDragEnd={onDrag}
      ></FloatButton>
      <Modal
        styles={{
          content: {
            background: "rgba(0,0,0,0)",
            boxShadow: "none",
            maxHeight: "80vh",
          },
        }}
        maskClosable
        // onClose={handleClose}
        onCancel={handleClose}
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
