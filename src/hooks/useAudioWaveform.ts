import { useEffect, useRef, useState, useCallback } from 'react';
import { generateWaveformData, drawWaveform } from '../utils';

interface UseAudioWaveformOptions {
  audioUrl: string | null;
  enabled: boolean;
}

export function useAudioWaveform({ audioUrl, enabled }: UseAudioWaveformOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const waveformDataRef = useRef<Float32Array | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      setError('Web Audio API no soportado');
    }
  }, []);

  const loadAudio = useCallback(async () => {
    if (!audioUrl || !enabled) return;
    
    await initAudioContext();
    if (!audioContextRef.current) return;
    
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
      
      // Generate waveform data when canvas is ready
      if (canvasRef.current) {
        generateWaveform();
      }
      
      setIsReady(true);
      setError(null);
    } catch (e) {
      console.error('Failed to load audio:', e);
      setError('Error al cargar audio');
    }
  }, [audioUrl, enabled, initAudioContext]);

  const generateWaveform = useCallback(() => {
    if (!audioBufferRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const width = canvas.width;
    const data = generateWaveformData(audioBufferRef.current, width);
    waveformDataRef.current = data;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawWaveform(ctx, data, width, canvas.height, '#4da6ff');
    }
  }, []);

  const drawProgress = useCallback((progress: number) => {
    if (!waveformDataRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Redraw full waveform
    drawWaveform(ctx, waveformDataRef.current, width, height, '#4da6ff', progress, '#ffd700');
  }, []);

  const resize = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    if (waveformDataRef.current) {
      // Regenerate at new width
      if (audioBufferRef.current) {
        const data = generateWaveformData(audioBufferRef.current, canvas.width);
        waveformDataRef.current = data;
        const ctx2 = canvas.getContext('2d');
        if (ctx2) {
          drawWaveform(ctx2, data, canvas.width, canvas.height, '#4da6ff');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (enabled && audioUrl) {
      loadAudio();
    }
    
    // Handle resize
    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled, audioUrl, loadAudio, resize]);

  useEffect(() => {
    if (canvasRef.current && waveformDataRef.current) {
      resize();
    }
  }, [waveformDataRef.current, resize]);

  return {
    canvasRef,
    isReady,
    error,
    drawProgress,
    audioContext: audioContextRef.current,
    audioBuffer: audioBufferRef.current,
  };
}