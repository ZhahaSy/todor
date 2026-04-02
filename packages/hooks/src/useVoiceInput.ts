import { useState, useRef, useCallback } from 'react';
import { recognizeAudio } from '@client/api';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

const TARGET_SAMPLE_RATE = 16000;

/** Float32 PCM samples → WAV Blob（16-bit, mono） */
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
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);         // PCM
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

/** 使用 OfflineAudioContext 将 PCM 重采样到目标采样率 */
async function resample(samples: Float32Array, fromRate: number, toRate: number): Promise<Float32Array> {
  if (fromRate === toRate) return samples;
  const duration = samples.length / fromRate;
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(duration * toRate), toRate);
  const srcBuffer = offlineCtx.createBuffer(1, samples.length, fromRate);
  srcBuffer.copyToChannel(samples, 0);
  const src = offlineCtx.createBufferSource();
  src.buffer = srcBuffer;
  src.connect(offlineCtx.destination);
  src.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
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

      // 不指定 sampleRate，使用设备原生采样率，避免移动端不支持自定义采样率报错
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      // iOS Safari 需要 resume（用户手势后可能仍处于 suspended 状态）
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
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
      if (msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('denied')) {
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
    const nativeSampleRate = audioCtxRef.current?.sampleRate ?? TARGET_SAMPLE_RATE;

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

    const total = chunks.reduce((n: number, c: Float32Array) => n + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    setIsProcessing(true);
    try {
      // 重采样到 16kHz（后端 ASR 要求）
      const resampled = await resample(merged, nativeSampleRate, TARGET_SAMPLE_RATE);
      const wavBlob = encodeWav(resampled, TARGET_SAMPLE_RATE);

      const arrayBuffer = await wavBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      const text = await recognizeAudio({ audioData: base64, format: 'wav', dataLen: arrayBuffer.byteLength });

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
