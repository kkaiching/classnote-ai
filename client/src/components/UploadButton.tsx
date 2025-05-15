import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UploadSection } from "@/components/UploadSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function UploadButton() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="rounded-full h-10 w-10 p-0 bg-primary hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上傳錄音檔</DialogTitle>
        </DialogHeader>
        <UploadSection onUploadSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}