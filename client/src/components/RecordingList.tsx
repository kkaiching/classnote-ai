import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, Clock, Calendar, FileText, FileCheck, Trash2,
  AlertTriangle 
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDuration, formatDate } from "@/lib/formatTime";
import { getStatusClass, formatStatus } from "@/lib/audioUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { Recording } from "@shared/schema";

export function RecordingList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recordingToDelete, setRecordingToDelete] = useState<Recording | null>(null);

  const { data: recordings, isLoading, error } = useQuery<Recording[]>({
    queryKey: ["/api/recordings"],
  });

  // 刪除錄音的mutation
  const deleteRecordingMutation = useMutation({
    mutationFn: async (recordingId: number) => {
      return apiRequest("DELETE", `/api/recordings/${recordingId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "已刪除錄音",
        description: "錄音已成功刪除",
      });
      
      // 重新獲取錄音列表
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      
      // 重置要刪除的錄音
      setRecordingToDelete(null);
    },
    onError: (error) => {
      console.error("Error deleting recording:", error);
      toast({
        title: "刪除失敗",
        description: "無法刪除錄音，請稍後再試",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRecording = (e: React.MouseEvent, recording: Recording) => {
    e.preventDefault();
    e.stopPropagation();
    setRecordingToDelete(recording);
  };

  const confirmDelete = () => {
    if (recordingToDelete) {
      deleteRecordingMutation.mutate(recordingToDelete.id);
    }
  };

  const handleRetry = async (e: React.MouseEvent, recordingId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      toast({
        title: "處理中",
        description: "正在重新處理檔案...",
      });
      
      await apiRequest("POST", `/api/transcribe/${recordingId}`, {});
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      queryClient.invalidateQueries({ queryKey: [`/api/recordings/${recordingId}`] });
      
      toast({
        title: "成功",
        description: "檔案正在重新處理中",
      });
    } catch (error) {
      console.error("Error retrying recording:", error);
      toast({
        title: "處理失敗",
        description: "無法重新處理檔案，請稍後再試",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">您的錄音檔</h2>
          <div className="text-sm text-gray-500">載入中...</div>
        </div>
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">無法載入錄音列表</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/recordings"] })}
          variant="outline"
        >
          重試
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">您的錄音檔</h2>
        <div className="text-sm text-gray-500">
          共 {recordings?.length || 0} 個錄音
        </div>
      </div>

      {/* 刪除確認對話框 */}
      <AlertDialog open={!!recordingToDelete} onOpenChange={(open) => !open && setRecordingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              確認刪除
            </AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除錄音 "{recordingToDelete?.title}" 嗎？此操作無法撤銷，所有相關資料（包括逐字稿和筆記）都將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteRecordingMutation.isPending ? "刪除中..." : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {recordings && recordings.length > 0 ? (
        <div className="space-y-4">
          {recordings.map((recording) => {
            const statusClasses = getStatusClass(recording.status);
            
            return (
              <div key={recording.id} className="relative group">
                <Link href={`/recording/${recording.id}`}>
                  <div className="block">
                    <Card className="bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-800">
                              {recording.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-3 items-center text-sm text-gray-500">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>
                                  {recording.duration
                                    ? formatDuration(recording.duration)
                                    : "處理中"}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>{formatDate(recording.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses.bgClass} ${statusClasses.textClass} ${statusClasses.animateClass || ''}`}>
                              {formatStatus(recording.status)}
                            </span>
                          </div>
                        </div>
                        
                        {recording.status === 'processing' && (
                          <div className="mt-3">
                            <Progress value={75} className="h-2" />
                            <p className="mt-1 text-xs text-gray-500">
                              正在處理中 (75%)
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-3 flex justify-between items-center">
                          <div className="flex space-x-4">
                            {recording.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-primary hover:bg-blue-50"
                                onClick={(e) => handleRetry(e, recording.id)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                重試
                              </Button>
                            )}
                            
                            {recording.status === 'completed' && (
                              <div className="flex space-x-4">
                                <div className="flex items-center text-sm text-gray-600">
                                  <FileText className="h-4 w-4 mr-1" />
                                  <span>逐字稿</span>
                                </div>
                                {recording.notesGenerated && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <FileCheck className="h-4 w-4 mr-1" />
                                    <span>筆記</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* 刪除按鈕 */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteRecording(e, recording)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">尚無錄音，請上傳您的第一個課堂錄音</p>
        </div>
      )}
    </div>
  );
}
