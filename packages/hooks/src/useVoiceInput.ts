import { useState, useRef, useCallback } from 'react';
import { recognizeAudio } from '@client/api';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

const SAMPLE_RATE = 16000;

/** Float32 PCM samples → WAV Blob（16-bit, mono, 16kHz） */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataLen = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);        // PCM chunk size
  view.setUint16(20, 1, true);         // PCM format
  view.setUint16(22, 1, true);         // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);         // block align
  view.setUint16(34, 16, true);        // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataLen, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function useVoiceInput({ onTranscript, onError }: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessorNode 是唯一能在旧版浏览器同步获取 PCM 的方式
      const processor = audioCtx.createScriptProcessor(4096, 1, 1) as ScriptProcessorNode;
      processorRef.current = processor;
      samplesRef.current = [];

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const data = (e.inputBuffer as AudioBuffer).getChannelData(0);
        samplesRef.current.push(new Float32Array(data));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsListening(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        onError?.('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
      } else {
        onError?.(`无法启动录音: ${msg}`);
      }
    }
  }, [onError]);

  const cancelListening = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    samplesRef.current = [];
    setIsListening(false);
  }, []);

  const stopAndRecognize = useCallback(async () => {
    // 先停止录音
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    streamRef.current = null;
    await audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsListening(false);

    const chunks = samplesRef.current;
    samplesRef.current = [];
    if (chunks.length === 0) return;

    // 合并所有 PCM 片段
    const total = chunks.reduce((n: number, c: Float32Array) => n + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = encodeWav(merged, SAMPLE_RATE);
    setIsProcessing(true);
    try {
      const arrayBuffer = await wavBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // btoa 处理大文件时分块转换避免栈溢出
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      const text = await recognizeAudio({ audioData: base64, format: 'wav', dataLen: arrayBuffer.byteLength });

      console.log('text',text)
      if (text) onTranscript(text);
    } catch {
      onError?.('语音识别失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [onTranscript, onError]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopAndRecognize();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopAndRecognize]);

  return { isListening, isProcessing, startListening, stopListening: stopAndRecognize, cancelListening, toggleListening };
}
