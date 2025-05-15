import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dropzone } from "@/components/ui/dropzone";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { FileUploadResponse } from "@shared/schema";

interface UploadSectionProps {
  onUploadSuccess?: () => void;
}

export function UploadSection({ onUploadSuccess }: UploadSectionProps = {}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFilesAccepted = (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
    
    // Extract title from filename (without extension)
    const filename = file.name.split(".").slice(0, -1).join(".");
    setTitle(filename);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "請選擇檔案",
        description: "請先選擇一個音檔上傳",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title || selectedFile.name);

      // Upload file
      const response = await fetch("/api/uploadAudio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`上傳失敗: ${response.statusText}`);
      }

      const data: FileUploadResponse = await response.json();

      toast({
        title: "上傳成功",
        description: "音檔已上傳，正在處理中",
      });

      // Reset form
      setSelectedFile(null);
      setTitle("");

      // Start transcription automatically
      try {
        await apiRequest("POST", `/api/transcribe/${data.recording.id}`, {});
      } catch (transcribeError) {
        console.error("Transcription failed:", transcribeError);
        // We don't show an error here to avoid confusing the user
        // The recording will show as "failed" in the list
      }

      // Invalidate the recordings query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      
      // 如果有設置上傳成功回調，則呼叫它
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "上傳失敗",
        description: error instanceof Error ? error.message : "無法上傳檔案，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="space-y-4">
        <Dropzone onFilesAccepted={handleFilesAccepted} />
        
        {selectedFile && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">錄音標題</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="請輸入錄音標題"
                className="mt-1"
              />
            </div>
            
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? "上傳中..." : "開始上傳"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
