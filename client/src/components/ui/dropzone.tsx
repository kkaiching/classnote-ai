import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileIcon } from "lucide-react";
import { formatFileSize, isValidFileType } from "@/lib/audioUtils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void;
}

export function Dropzone({ onFilesAccepted }: DropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!isValidFileType(file)) {
        toast({
          title: "不支援的檔案格式",
          description: "請上傳 MP3, M4A 或 WAV 格式的音檔",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      onFilesAccepted(acceptedFiles);
    },
    [onFilesAccepted, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/mp3': ['.mp3'],
      'audio/m4a': ['.m4a'],
      'audio/x-m4a': ['.m4a'],
      'audio/wav': ['.wav'],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`bg-white rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragActive ? "border-primary bg-blue-50" : "border-gray-300"
      } hover:border-primary hover:bg-blue-50 cursor-pointer`}
    >
      <input {...getInputProps()} />
      <div className="space-y-4">
        {selectedFile ? (
          <div className="flex flex-col items-center">
            <FileIcon className="h-12 w-12 text-primary" />
            <p className="mt-2 text-sm font-medium text-gray-700">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(selectedFile.size)}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
            >
              更換檔案
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-gray-700">拖放您的音檔至此處，或</p>
              <Button variant="default" size="sm" className="mt-2">
                瀏覽檔案
              </Button>
            </div>
            <p className="text-sm text-gray-500">支援格式：MP3, M4A, WAV</p>
          </>
        )}
      </div>
    </div>
  );
}
