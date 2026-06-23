/**
 * Speech Service Adapter
 * 
 * Provides a unified interface for speech recognition and synthesis.
 * Uses Whisper + Coqui TTS by default, falls back to Web Speech API if unavailable.
 */

import { useWhisperSTT } from './useWhisperSTT';
import { useCoquiTTS } from './useCoquiTTS';
import { useState, useEffect, useCallback, useRef } from 'react';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

interface UseSpeechServicesOptions {
  preferWhisper?: boolean;
  whisperUrl?: string;
  ttsUrl?: string;
}

export const useSpeechServices = (options: UseSpeechServicesOptions = {}) => {
  const {
    preferWhisper = true,
    whisperUrl = process.env.NEXT_PUBLIC_WHISPER_URL || 'http://localhost:9000',
    ttsUrl = process.env.NEXT_PUBLIC_COQUI_TTS_URL || 'http://localhost:5002'
  } = options;

  const [useWhisper, setUseWhisper] = useState(preferWhisper);
  const [useWebSpeech, setUseWebSpeech] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'whisper' | 'webspeech'>('checking');

  const whisperSTT = useWhisperSTT({ whisperUrl });
  const coquiTTS = useCoquiTTS({ ttsUrl });

  const webSpeechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Check if Whisper service is available
  useEffect(() => {
    const checkWhisperAvailability = async () => {
      if (!preferWhisper) {
        setUseWebSpeech(true);
        setServiceStatus('webspeech');
        return;
      }

      try {
        const response = await fetch(`${whisperUrl}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          setUseWhisper(true);
          setUseWebSpeech(false);
          setServiceStatus('whisper');
          console.log('✅ Whisper STT service available');
        } else {
          throw new Error('Whisper service not healthy');
        }
      } catch (error) {
        console.warn('⚠️ Whisper service unavailable, falling back to Web Speech API:', error);
        setUseWhisper(false);
        setUseWebSpeech(true);
        setServiceStatus('webspeech');
      }
    };

    checkWhisperAvailability();
  }, [preferWhisper, whisperUrl]);

  // Initialize Web Speech API if needed
  useEffect(() => {
    if (useWebSpeech && !webSpeechRecognitionRef.current) {
      const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
      const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
      
      if (Ctor) {
        const rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        webSpeechRecognitionRef.current = rec;
      }
    }
  }, [useWebSpeech]);

  // Unified speak function
  const speak = useCallback(async (text: string): Promise<void> => {
    if (useWhisper) {
      try {
        await coquiTTS.speak(text);
      } catch (error) {
        console.warn('Coqui TTS failed, falling back to Web Speech:', error);
        // Fallback to Web Speech Synthesis
        return new Promise((resolve) => {
          if (typeof window === 'undefined') {
            resolve();
            return;
          }
          const synth = window.speechSynthesis;
          if (!synth) {
            resolve();
            return;
          }
          synth.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          synth.speak(utterance);
        });
      }
    } else {
      // Use Web Speech Synthesis
      return new Promise((resolve) => {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }
        const synth = window.speechSynthesis;
        if (!synth) {
          resolve();
          return;
        }
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synth.speak(utterance);
      });
    }
  }, [useWhisper, coquiTTS]);

  const stopSpeaking = useCallback(() => {
    if (useWhisper) {
      coquiTTS.stop();
    } else {
      window.speechSynthesis?.cancel();
    }
  }, [useWhisper, coquiTTS]);

  return {
    // Service status
    serviceStatus,
    usingWhisper: useWhisper,
    usingWebSpeech: useWebSpeech,

    // STT (for Whisper mode)
    whisperSTT,

    // Web Speech Recognition (for fallback mode)
    webSpeechRecognition: webSpeechRecognitionRef.current,

    // TTS (unified interface)
    speak,
    stopSpeaking,
    isSpeaking: useWhisper ? coquiTTS.isSpeaking : false,

    // Errors
    sttError: useWhisper ? whisperSTT.error : null,
    ttsError: useWhisper ? coquiTTS.error : null,
  };
};
