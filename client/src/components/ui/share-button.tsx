import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  title: string;
  content: string | null | undefined;
  type: "audio" | "transcript" | "notes";
  disabled?: boolean;
  className?: string;
}

export function ShareButton({ 
  title, 
  content, 
  type, 
  disabled = false,
  className = ""
}: ShareButtonProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  // 檢查內容是否為空
  const isEmpty = !content || content.trim() === "";

  // 根據分享內容類型生成適當的標題
  const getShareTitle = () => {
    const baseTitle = `${title} - `;
    switch (type) {
      case "audio":
        return `${baseTitle}音頻錄音`;
      case "transcript":
        return `${baseTitle}逐字稿`;
      case "notes":
        return `${baseTitle}AI筆記`;
      default:
        return baseTitle;
    }
  };

  // 複製到剪貼簿
  const copyToClipboard = async () => {
    if (isEmpty) return;

    try {
      setIsSharing(true);
      await navigator.clipboard.writeText(content as string);
      toast({
        title: "已複製到剪貼簿",
        description: `${getShareTitle()}已複製到剪貼簿`,
      });
    } catch (error) {
      toast({
        title: "複製失敗",
        description: "無法複製內容，請稍後重試",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  // 通過手機的分享功能分享
  const mobileShare = async () => {
    if (isEmpty) return;
    
    // 檢查瀏覽器是否支援Web Share API
    if (typeof navigator === 'undefined' || !navigator.share) {
      toast({
        title: "不支援的功能",
        description: "您的瀏覽器不支援Web Share API",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSharing(true);
      await navigator.share({
        title: getShareTitle(),
        text: content as string,
      });
      toast({
        title: "分享成功",
        description: "內容已成功分享",
      });
    } catch (error) {
      // 用戶取消分享不顯示錯誤
      if ((error as Error).name !== "AbortError") {
        toast({
          title: "分享失敗",
          description: "無法分享內容，請稍後重試",
          variant: "destructive",
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`${className}`}
          disabled={disabled || isEmpty || isSharing}
        >
          <Share2 className="h-4 w-4 mr-2" />
          分享
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyToClipboard} disabled={isEmpty}>
          複製到剪貼簿
        </DropdownMenuItem>
        {/* 只在支援Web Share API的裝置上顯示 */}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <DropdownMenuItem onClick={mobileShare} disabled={isEmpty}>
            分享...
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}