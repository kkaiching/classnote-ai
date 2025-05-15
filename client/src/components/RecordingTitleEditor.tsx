import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { Recording } from "@shared/schema";

interface RecordingTitleEditorProps {
  recording: Recording;
  className?: string;
}

export function RecordingTitleEditor({ recording, className = "" }: RecordingTitleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(recording.title);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleSave = async () => {
    // Don't save if title is empty or unchanged
    if (!title.trim()) {
      toast({
        title: "標題不得為空",
        variant: "destructive",
      });
      setTitle(recording.title); // Reset to original title
      setIsEditing(false);
      return;
    }
    
    if (title === recording.title) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await apiRequest("PATCH", `/api/recordings/${recording.id}`, {
        title: title.trim(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "標題儲存失敗");
      }
      
      // Update queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      queryClient.invalidateQueries({ queryKey: [`/api/recordings/${recording.id}`] });
      
      toast({
        title: "標題已更新",
        description: "錄音標題已成功儲存",
      });
      
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving title:", err);
      setError(err instanceof Error ? err.message : "標題儲存失敗，請稍後再試");
      
      toast({
        title: "標題儲存失敗",
        description: error || "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setTitle(recording.title); // Reset title
      setIsEditing(false);
    }
  };
  
  const handleBlur = () => {
    handleSave();
  };
  
  return (
    <div className={`relative group ${className}`}>
      {isEditing ? (
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          className="font-bold text-2xl h-auto py-1 bg-gray-50 focus:bg-white"
        />
      ) : (
        <div 
          className="flex items-center cursor-pointer py-1 hover:bg-gray-50 rounded" 
          onClick={handleEdit}
        >
          <h1 className="text-2xl font-bold text-gray-800 mr-2">{title}</h1>
          <Pencil className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}