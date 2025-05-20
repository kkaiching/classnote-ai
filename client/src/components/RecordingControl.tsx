import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, Pause, Square } from "lucide-react";
import { formatTime } from "@/lib/formatTime";
import { useQueryClient } from "@tanstack/react-query";

export function RecordingControl() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cleanup function
  useEffect(() => {
    return () => {
      // Stop any active recording and clean up when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start recording function
  const startRecording = async () => {
    recordedChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // 嘗試使用 MP3 格式，如果不支援則使用其他相容性高的格式
      const mimeTypes = [
        'audio/mp3',
        'audio/mpeg',
        'audio/mp4',
        'audio/aac',
        'audio/webm;codecs=opus',
        'audio/wav'
      ];
      
      // 找到瀏覽器支援的第一個 MIME 類型
      let mimeType = 'audio/webm'; // 預設
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`使用錄音格式: ${mimeType}`);
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      // Start the timer for recording time
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "錄音失敗",
        description: "請允許麥克風使用權限",
        variant: "destructive",
      });
    }
  };
  
  // Pause recording function
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        
        // Pause the timer
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (error) {
        console.error('Error pausing recording:', error);
        toast({
          title: "暫停失敗",
          description: "無法暫停錄音，請直接完成錄音",
          variant: "destructive",
        });
      }
    }
  };
  
  // Resume recording function
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        
        // Resume the timer
        timerRef.current = window.setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } catch (error) {
        console.error('Error resuming recording:', error);
        toast({
          title: "繼續失敗",
          description: "無法繼續錄音，請重新開始",
          variant: "destructive",
        });
      }
    }
  };
  
  // Stop recording function
  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Stop the timer
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Upload recording
      await uploadRecording();
      
      // Reset state
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
    }
  };
  
  // Toggle recording function
  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };
  
  // Upload recording function
  const uploadRecording = async () => {
    if (recordedChunksRef.current.length === 0) {
      toast({
        title: "錄音失敗",
        description: "無法產生錄音檔，請重新嘗試",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // 從 mediaRecorder 獲取 MIME 類型
      let mimeType = 'audio/mp3';
      if (mediaRecorderRef.current && mediaRecorderRef.current.mimeType) {
        mimeType = mediaRecorderRef.current.mimeType;
      }
      
      // 根據 MIME 類型決定檔案擴展名
      let fileExtension = '.mp3';
      if (mimeType.includes('webm')) {
        fileExtension = '.webm';
      } else if (mimeType.includes('mp4') || mimeType.includes('aac')) {
        fileExtension = '.m4a';
      } else if (mimeType.includes('wav')) {
        fileExtension = '.wav';
      }
      
      // Create a blob with the recorded chunks
      const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
      
      // Create a filename with current date and time
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const filename = `${dateStr}-${timeStr}${fileExtension}`;
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', audioBlob, filename);
      
      // Upload the recording
      const response = await fetch('/api/uploadAudio', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      // 自動開始轉錄
      if (data.recording && data.recording.id) {
        try {
          await fetch(`/api/transcribe/${data.recording.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });
        } catch (error) {
          console.error('Error starting transcription:', error);
          // 即使轉錄啟動失敗也繼續，不要中斷流程
        }
      }
      
      // Show success toast
      toast({
        title: "錄音上傳成功",
        description: "錄音檔案已上傳並開始自動轉錄",
      });
      
      // Invalidate recordings query to refresh list
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "上傳失敗",
        description: "錄音檔上傳失敗，請稍後重試",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Recording timer */}
        {isRecording && (
          <div className={`text-xl font-medium mb-2 ${isPaused ? 'text-gray-500' : 'text-primary'}`}>
            {formatTime(recordingTime)}
          </div>
        )}
        
        <div className="flex items-center gap-4">
          {/* Main recording button */}
          <Button
            size="lg"
            className={`rounded-full w-14 h-14 flex items-center justify-center ${
              isPaused ? 'bg-green-600 hover:bg-green-700' : 
              isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
            }`}
            onClick={toggleRecording}
            disabled={isUploading}
          >
            {isPaused ? (
              <Mic className="h-6 w-6" />
            ) : isRecording ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          
          {/* Stop button - only show when recording */}
          {isRecording && (
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full px-6"
              onClick={stopRecording}
              disabled={isUploading}
            >
              <Square className="h-4 w-4 mr-2" />
              完成錄音
              {isUploading && '中...'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}