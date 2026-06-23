import { useState, useRef, useCallback } from 'react';
import RecordRTC from 'recordrtc';

interface UseWhisperSTTOptions {
  whisperUrl?: string;
}

export const useWhisperSTT = (options: UseWhisperSTTOptions = {}) => {
  const { whisperUrl = process.env.NEXT_PUBLIC_WHISPER_URL } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      
      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000
      });
      
      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!recorderRef.current) {
        reject('No recorder instance');
        return;
      }

      recorderRef.current.stopRecording(async () => {
        const blob = recorderRef.current!.getBlob();
        
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        // Send to Whisper
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');
        
        try {
          const response = await fetch(`${whisperUrl}/v1/audio/transcriptions`, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Whisper API error: ${response.status}`);
          }
          
          const result = await response.json();
          const text = result.text || '';
          
          setTranscript(text);
          setIsRecording(false);
          setError(null);
          resolve(text);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Transcription failed';
          setError(message);
          console.error('Transcription failed:', err);
          setIsRecording(false);
          reject(err);
        }
      });
    });
  }, [whisperUrl]);

  const reset = useCallback(() => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stopRecording(() => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
      });
    }
    setIsRecording(false);
    setTranscript('');
    setError(null);
  }, [isRecording]);

  return {
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
    reset
  };
};
