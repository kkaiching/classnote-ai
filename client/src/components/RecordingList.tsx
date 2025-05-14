import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Clock, Calendar, FileText, FileCheck } from "lucide-react";
import { formatDuration, formatDate } from "@/lib/formatTime";
import { getStatusClass, formatStatus } from "@/lib/audioUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { Recording } from "@shared/schema";

export function RecordingList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recordings, isLoading, error } = useQuery<Recording[]>({
    queryKey: ["/api/recordings"],
  });

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

      {recordings && recordings.length > 0 ? (
        <div className="space-y-4">
          {recordings.map((recording) => {
            const statusClasses = getStatusClass(recording.status);
            
            return (
              <Link key={recording.id} href={`/recording/${recording.id}`}>
                <a className="block">
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
                      
                      {recording.status === 'failed' && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary hover:bg-blue-50"
                            onClick={(e) => handleRetry(e, recording.id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            重試
                          </Button>
                        </div>
                      )}
                      
                      {recording.status === 'completed' && (
                        <div className="mt-3 flex space-x-4">
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
                    </CardContent>
                  </Card>
                </a>
              </Link>
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
