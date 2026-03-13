import { useState, useEffect, useRef } from 'react';
import { detectFormat, type InputFormat } from '@/lib/format-detector';

export function useFormatDetection(content: string): InputFormat {
  const [detectedFormat, setDetectedFormat] = useState<InputFormat>('markdown');
  const formatTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (formatTimerRef.current) {
      clearTimeout(formatTimerRef.current);
    }
    formatTimerRef.current = setTimeout(() => {
      setDetectedFormat(detectFormat(content));
    }, 300);
    return () => {
      if (formatTimerRef.current) {
        clearTimeout(formatTimerRef.current);
      }
    };
  }, [content]);

  return detectedFormat;
}
