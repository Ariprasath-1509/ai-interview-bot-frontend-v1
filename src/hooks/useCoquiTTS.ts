import { useState, useRef, useCallback } from 'react';

interface UseCoquiTTSOptions {
  ttsUrl?: string;
}

export const useCoquiTTS = (options: UseCoquiTTSOptions = {}) => {
  const { ttsUrl = process.env.NEXT_PUBLIC_TTS_URL } = options;
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, Blob>>(new Map());

  const speak = useCallback(async (text: string): Promise<void> => {
    try {
      setError(null);
      setIsSpeaking(true);
      
      // Check cache first
      let audioBlob: Blob;
      if (audioCache.current.has(text)) {
        audioBlob = audioCache.current.get(text)!;
      } else {
        const response = await fetch(`${ttsUrl}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
          throw new Error(`TTS API error: ${response.status}`);
        }
        
        audioBlob = await response.blob();
        
        // Cache for reuse (limit cache size)
        if (audioCache.current.size < 50) {
          audioCache.current.set(text, audioBlob);
        }
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop previous audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (err) => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          const message = 'Audio playback failed';
          setError(message);
          reject(new Error(message));
        };
        
        audio.play().catch((err) => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          const message = err instanceof Error ? err.message : 'Failed to play audio';
          setError(message);
          reject(err);
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS failed';
      setError(message);
      setIsSpeaking(false);
      console.error('TTS failed:', err);
      throw err;
    }
  }, [ttsUrl]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    audioCache.current.clear();
  }, []);

  return { 
    isSpeaking, 
    error,
    speak, 
    stop,
    clearCache
  };
};
