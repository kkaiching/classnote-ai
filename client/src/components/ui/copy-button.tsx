import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyButtonProps {
  text: string;
  variant?: "outline" | "default";
  label?: string;
  successMessage?: string;
  className?: string;
}

export function CopyButton({
  text,
  variant = "outline",
  label = "複製",
  successMessage = "已複製到剪貼簿",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "成功",
        description: successMessage,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "複製失敗",
        description: "無法複製內容，請手動選取並複製",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-4 w-4 mr-2" />
      ) : (
        <Copy className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
