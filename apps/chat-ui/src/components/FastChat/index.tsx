import { FloatButton, Modal } from "antd";

import { useRef, useState } from "react";

import {useDrag} from 'ahooks'

import { FloatButtonElement } from "antd/es/float-button/interface";
import { MessageFilled } from "@ant-design/icons";

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

  useDrag('', dragRef, {
    onDragEnd: (e) => {
      setPosition({
        left: e.pageX + 'px',
        top: e.pageY + 'px',
      })
    },
  });
  return (
    <>
      <FloatButton
        ref={dragRef}
        onClick={() => {
          setOpen((preState) => !preState);
        }}
        icon={null}
        style={{ width: 40, height: 40, ...position }}
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
      </Modal>
    </>
  );
};
export default FastChat;
