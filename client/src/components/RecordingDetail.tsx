import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, Clock, Calendar, FileAudio, RefreshCw, 
  Trash2, AlertTriangle, Share2, Download, SendHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioPlayer } from "@/components/ui/audio-player";
import { CopyButton } from "@/components/ui/copy-button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RecordingTitleEditor } from "@/components/RecordingTitleEditor";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDuration, formatDate } from "@/lib/formatTime";
import { formatFileSize } from "@/lib/audioUtils";
import { Recording, Transcript, Note } from "@shared/schema";

interface RecordingDetailProps {
  recordingId: number;
}

export function RecordingDetail({ recordingId }: RecordingDetailProps) {
  const [activeTab, setActiveTab] = useState("transcript");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch recording details
  const { 
    data: recording,
    isLoading: isLoadingRecording,
    error: recordingError
  } = useQuery<Recording>({
    queryKey: [`/api/recordings/${recordingId}`],
  });

  // Fetch transcript
  const {
    data: transcript,
    isLoading: isLoadingTranscript,
    error: transcriptError
  } = useQuery<{ content: Array<{ timestamp: string; speaker: string; text: string }> }>({
    queryKey: [`/api/recordings/${recordingId}/transcript`],
    enabled: !!recording?.transcribed,
  });

  // Fetch notes
  const {
    data: notes,
    isLoading: isLoadingNotes,
    error: notesError
  } = useQuery<{ content: string }>({
    queryKey: [`/api/recordings/${recordingId}/notes`],
    enabled: !!recording?.notesGenerated,
  });

  // Generate notes mutation
  const generateNotesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/generateNote/${recordingId}`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "筆記已生成",
        description: "AI 筆記已成功生成",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/recordings/${recordingId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/recordings/${recordingId}/notes`] });
    },
    onError: (error) => {
      toast({
        title: "筆記生成失敗",
        description: "無法生成筆記，請稍後再試",
        variant: "destructive",
      });
    },
  });

  // Delete recording mutation
  const deleteRecordingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/recordings/${recordingId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "已刪除錄音",
        description: "錄音已成功刪除",
      });
      
      // 關閉刪除對話框
      setShowDeleteDialog(false);
      
      // 導航回首頁
      navigate('/');
    },
    onError: (error) => {
      console.error("Error deleting recording:", error);
      toast({
        title: "刪除失敗",
        description: "無法刪除錄音，請稍後再試",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    },
  });

  // Handle timestamp click in transcript
  const handleTimestampClick = (timestamp: number) => {
    if (window && (window as any).seekToTimestamp) {
      (window as any).seekToTimestamp(timestamp);
    }
  };

  // Convert API transcript response to our internal format
  const processTranscript = (content: Array<{ timestamp: string; speaker: string; text: string }> | undefined) => {
    if (!content || content.length === 0) return [];
    
    return content.map(item => {
      // Convert timestamp "MM:SS" to seconds
      const [minutes, seconds] = item.timestamp.split(':').map(num => parseInt(num, 10));
      const timestamp = minutes * 60 + seconds;
      
      return {
        timestamp,
        speaker: item.speaker,
        text: item.text
      };
    });
  };
  
  const parsedTranscript = transcript?.content ? processTranscript(transcript.content) : [];

  // Check if we need to regenerate notes
  const canGenerateNotes = recording?.transcribed && !generateNotesMutation.isPending;

  if (isLoadingRecording) {
    return (
      <div>
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="text-gray-600">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>載入中...</span>
          </Button>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full mt-4" />
          <Skeleton className="h-64 w-full mt-4" />
        </div>
      </div>
    );
  }

  if (recordingError || !recording) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/">
            <a className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span>返回錄音列表</span>
            </a>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">無法載入錄音詳情</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/recordings/${recordingId}`] })}
                variant="outline"
              >
                重試
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              確認刪除
            </AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除錄音 "{recording?.title}" 嗎？此操作無法撤銷，所有相關資料（包括逐字稿和筆記）都將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRecordingMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRecordingMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteRecordingMutation.isPending}
            >
              {deleteRecordingMutation.isPending ? "刪除中..." : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back button and action buttons */}
      <div className="mb-6 flex justify-between items-center">
        <Link href="/">
          <div className="inline-flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>返回錄音列表</span>
          </div>
        </Link>
        
        <Button
          variant="outline"
          size="sm"
          className="text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          刪除錄音
        </Button>
      </div>

      {/* Recording header */}
      <div className="mb-6">
        <RecordingTitleEditor recording={recording} />
        <div className="mt-2 flex flex-wrap items-center text-gray-500 text-sm gap-x-4 gap-y-2">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{recording.duration ? formatDuration(recording.duration) : "處理中"}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formatDate(recording.createdAt)}</span>
          </div>
          <div className="flex items-center">
            <FileAudio className="h-4 w-4 mr-1" />
            <span>{recording.fileFormat.toUpperCase()} - {formatFileSize(recording.fileSize)}</span>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-800">錄音檔</h2>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              const fileExt = recording.filename.split('.').pop() || 'audio';
              const url = `${window.location.origin}/api/recordings/${recordingId}/download`;
              
              if (navigator.share) {
                // 先嘗試使用URL分享 (macOS分享表單)
                navigator.share({
                  title: `${recording.title} - 錄音`,
                  url: url
                }).catch(err => {
                  // 如果URL分享失敗，再嘗試檔案分享
                  if (err.name !== 'AbortError' && navigator.canShare) {
                    // 使用 fetch 先下載檔案內容
                    fetch(url)
                      .then(response => response.blob())
                      .then(blob => {
                        const file = new File(
                          [blob], 
                          `${recording.title}.${fileExt}`, 
                          { type: blob.type }
                        );
                        
                        // 檢查是否可以分享此檔案
                        if (navigator.canShare({ files: [file] })) {
                          navigator.share({
                            title: `${recording.title} - 錄音`,
                            files: [file]
                          }).catch(err => {
                            // 只有在非使用者取消的情況下才執行下載
                            if (err.name !== 'AbortError') {
                              window.location.href = url;
                            }
                          });
                        } else {
                          // 不支援檔案分享時直接下載
                          window.location.href = url;
                        }
                      })
                      .catch(err => {
                        // 發生錯誤時直接下載
                        window.location.href = url;
                      });
                  } else if (err.name !== 'AbortError') {
                    // 其他錯誤時直接下載
                    window.location.href = url;
                  }
                });
              } else {
                // 不支援分享API時直接下載
                window.location.href = url;
              }
            }}
          >
            <Share2 className="h-4 w-4" />
            <span>分享</span>
          </Button>
        </div>
        <AudioPlayer 
          src={`/api/audio/${recording.filename}`}
          onTimeUpdate={setCurrentTime}
          onPlayStateChange={setIsPlaying}
        />
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="transcript" onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-2">
          <TabsTrigger value="transcript">逐字稿</TabsTrigger>
          <TabsTrigger value="notes">AI 筆記</TabsTrigger>
        </TabsList>
        
        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">詳細逐字稿</h2>
            {transcript?.content && transcript.content.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    const url = `${window.location.origin}/api/recordings/${recordingId}/transcript/download`;
                    
                    if (navigator.share) {
                      // 先嘗試使用URL分享 (macOS分享表單)
                      navigator.share({
                        title: `${recording.title} - 逐字稿`,
                        url: url
                      }).catch(err => {
                        // 如果URL分享失敗，再嘗試檔案分享
                        if (err.name !== 'AbortError' && navigator.canShare) {
                          // 使用 fetch 先下載檔案內容
                          fetch(url)
                            .then(response => response.blob())
                            .then(blob => {
                              const file = new File(
                                [blob], 
                                `${recording.title}_transcript.txt`, 
                                { type: 'text/plain' }
                              );
                              
                              // 檢查是否可以分享此檔案
                              if (navigator.canShare({ files: [file] })) {
                                navigator.share({
                                  title: `${recording.title} - 逐字稿`,
                                  files: [file]
                                }).catch(err => {
                                  // 只有在非使用者取消的情況下才執行下載
                                  if (err.name !== 'AbortError') {
                                    window.location.href = url;
                                  }
                                });
                              } else {
                                // 不支援檔案分享時直接下載
                                window.location.href = url;
                              }
                            })
                            .catch(err => {
                              // 發生錯誤時直接下載
                              window.location.href = url;
                            });
                        } else if (err.name !== 'AbortError') {
                          // 其他錯誤時直接下載
                          window.location.href = url;
                        }
                      });
                    } else {
                      // 不支援分享API時直接下載
                      window.location.href = url;
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  <span>分享</span>
                </Button>
                <CopyButton
                  text={transcript.content.map(item => `${item.timestamp} ${item.speaker}：${item.text}`).join('\n')}
                  label="複製全文"
                  successMessage="逐字稿已複製到剪貼簿"
                />
              </div>
            )}
          </div>
          
          <Card>
            <CardContent className="p-4">
              {isLoadingTranscript ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-2">
                      <Skeleton className="h-4 w-12" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transcriptError || !transcript ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    {recording.transcribed 
                      ? "無法載入逐字稿" 
                      : "此錄音尚未產生逐字稿"}
                  </p>
                  {recording.status === 'failed' && (
                    <Button
                      onClick={async () => {
                        try {
                          toast({
                            title: "處理中",
                            description: "正在重新處理檔案...",
                          });
                          
                          await apiRequest("POST", `/api/transcribe/${recordingId}`, {});
                          
                          queryClient.invalidateQueries({ queryKey: [`/api/recordings/${recordingId}`] });
                          
                          toast({
                            title: "成功",
                            description: "檔案正在重新處理中",
                          });
                        } catch (error) {
                          toast({
                            title: "處理失敗",
                            description: "無法重新處理檔案，請稍後再試",
                            variant: "destructive",
                          });
                        }
                      }}
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      重新產生逐字稿
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    {parsedTranscript.map((item, index) => (
                      <div
                        key={index}
                        className="group hover:bg-gray-50 p-2 -m-2 rounded-md cursor-pointer"
                        onClick={() => handleTimestampClick(item.timestamp)}
                      >
                        <div className="flex items-start">
                          <span className="font-mono text-sm text-gray-500 mr-3 pt-0.5 whitespace-nowrap">
                            {formatDuration(item.timestamp)}
                          </span>
                          <div>
                            <span className="text-gray-700 font-medium">{item.speaker}：</span>
                            <span className="text-gray-900">{item.text}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">AI 生成筆記</h2>
            <div className="flex space-x-2">
              {notes && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateNotesMutation.mutate()}
                    disabled={generateNotesMutation.isPending || !canGenerateNotes}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${generateNotesMutation.isPending ? 'animate-spin' : ''}`} />
                    重新生成
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      const url = `${window.location.origin}/api/recordings/${recordingId}/notes/download`;
                      
                      if (navigator.share) {
                        // 先嘗試使用URL分享 (macOS分享表單)
                        navigator.share({
                          title: `${recording.title} - AI筆記`,
                          url: url
                        }).catch(err => {
                          // 如果URL分享失敗，再嘗試檔案分享
                          if (err.name !== 'AbortError' && navigator.canShare) {
                            // 使用 fetch 先下載檔案內容
                            fetch(url)
                              .then(response => response.blob())
                              .then(blob => {
                                const file = new File(
                                  [blob], 
                                  `${recording.title}_notes.txt`, 
                                  { type: 'text/plain' }
                                );
                                
                                // 檢查是否可以分享此檔案
                                if (navigator.canShare({ files: [file] })) {
                                  navigator.share({
                                    title: `${recording.title} - AI筆記`,
                                    files: [file]
                                  }).catch(err => {
                                    // 只有在非使用者取消的情況下才執行下載
                                    if (err.name !== 'AbortError') {
                                      window.location.href = url;
                                    }
                                  });
                                } else {
                                  // 不支援檔案分享時直接下載
                                  window.location.href = url;
                                }
                              })
                              .catch(err => {
                                // 發生錯誤時直接下載
                                window.location.href = url;
                              });
                          } else if (err.name !== 'AbortError') {
                            // 其他錯誤時直接下載
                            window.location.href = url;
                          }
                        });
                      } else {
                        // 不支援分享API時直接下載
                        window.location.href = url;
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>分享</span>
                  </Button>
                  <CopyButton
                    text={notes.content}
                    variant="default"
                    label="複製筆記"
                    successMessage="筆記已複製到剪貼簿"
                  />
                </>
              )}
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {isLoadingNotes || generateNotesMutation.isPending ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-5 w-1/4 mt-4" />
                  <div className="ml-4 mt-2 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-5 w-1/4 mt-4" />
                  <div className="ml-4 mt-2 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ) : notesError || !notes ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    {recording.transcribed
                      ? "尚未生成筆記，點擊下方按鈕生成"
                      : "請先產生逐字稿才能生成筆記"}
                  </p>
                  {recording.transcribed && (
                    <Button
                      onClick={() => generateNotesMutation.mutate()}
                      disabled={!canGenerateNotes}
                    >
                      生成筆記
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="pr-4">
                    <MarkdownRenderer 
                      content={notes.content} 
                      className="prose prose-slate max-w-none" 
                    />
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
