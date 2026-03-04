import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onRecordingComplete: (audioUrl: string) => void;
  existingAudioUrl?: string;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, existingAudioUrl, disabled }) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [playing, setPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await uploadAudio(blob, mimeType === 'audio/webm' ? 'webm' : 'mp4');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert('Microphone access is required for voice recording.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const uploadAudio = async (blob: Blob, ext: string) => {
    setUploading(true);
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('screening-audio').upload(fileName, blob, {
      contentType: `audio/${ext}`,
    });
    if (error) {
      alert('Failed to upload recording.');
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('screening-audio').getPublicUrl(fileName);
    const url = urlData.publicUrl;
    setAudioUrl(url);
    onRecordingComplete(url);
    setUploading(false);
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const removeRecording = () => {
    setAudioUrl(null);
    onRecordingComplete('');
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />}

      {!recording && !uploading && !audioUrl && (
        <Button type="button" variant="outline" size="sm" onClick={startRecording} disabled={disabled} className="gap-1.5">
          <Mic className="h-4 w-4 text-destructive" /> Record Voice
        </Button>
      )}

      {recording && (
        <Button type="button" variant="destructive" size="sm" onClick={stopRecording} className="gap-1.5 animate-pulse">
          <Square className="h-3 w-3" /> Stop
        </Button>
      )}

      {uploading && (
        <Button type="button" variant="outline" size="sm" disabled className="gap-1.5">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
        </Button>
      )}

      {audioUrl && !uploading && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={togglePlay} disabled={disabled} className="gap-1.5">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? 'Pause' : 'Play'}
          </Button>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={removeRecording} className="gap-1 text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;
