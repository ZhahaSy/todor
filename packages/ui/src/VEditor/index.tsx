import { useState, useEffect, useRef } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";
import type { InputRef } from "antd";

interface VEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const VEditor = ({
  value,
  onChange,
  placeholder = "请输入内容",
  disabled = false,
  className = "",
}: VEditorProps) => {
  const [vd, setVd] = useState<Vditor>();

  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string>(
    `vditor-${Math.random().toString(36).substr(2, 9)}`,
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const vditor = new Vditor(idRef.current, {
      placeholder,
      mode: disabled ? "sv" : "wysiwyg",
      after: () => {
        if (value) {
          vditor.setValue(value);
        } else {
          vditor.setValue("");
        }
        setVd(vditor);
      },
      input: (value: string) => {
        onChange?.(value);
      },
    });

    // Clear the effect
    return () => {
      if (vd) {
        vditor?.destroy();
      }
      setVd(undefined);
    };
  }, []);

  // Update value when props change
  useEffect(() => {
    if (vd && value !== undefined) {
      const currentValue = vd.getValue();
      if (currentValue !== value) {
        vd.setValue(value);
      }
    }
  }, [value, vd]);

  // Update disabled state when props change
  useEffect(() => {
    if (vd) {
      disabled ? vd.disabled() : vd.enable();
    }
  }, [disabled, vd]);

  return (
    <div
      ref={containerRef}
      id={idRef.current}
      className={`vditor ${className}`}
      style={{ width: "100%", height: '200px', overflow: 'auto' }}
    />
  );
};

// 为了支持 Ant Design Form 的 ref 转发
export const VEditorForm = VEditor;
