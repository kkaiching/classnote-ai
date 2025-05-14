// Format file size from bytes to human-readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get status class based on recording status
export function getStatusClass(status: string): { bgClass: string; textClass: string; animateClass?: string } {
  switch (status.toLowerCase()) {
    case 'completed':
      return { bgClass: 'bg-green-100', textClass: 'text-green-800' };
    case 'processing':
      return { bgClass: 'bg-amber-100', textClass: 'text-amber-800', animateClass: 'animate-pulse' };
    case 'failed':
      return { bgClass: 'bg-red-100', textClass: 'text-red-800' };
    case 'pending':
    default:
      return { bgClass: 'bg-blue-100', textClass: 'text-blue-800' };
  }
}

// Format status text for display
export function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return '已完成';
    case 'processing':
      return '處理中';
    case 'failed':
      return '處理失敗';
    case 'pending':
      return '待處理';
    default:
      return status;
  }
}

// Check if file type is valid (MP3, M4A, WAV)
export function isValidFileType(file: File): boolean {
  const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/wav', 'audio/x-m4a'];
  return validTypes.includes(file.type);
}

// Extract timestamp from transcript line
export function extractTimestamp(line: string): number | null {
  const match = line.match(/^(\d{2}):(\d{2})/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }
  return null;
}

// Parse transcript with timestamps
export function parseTranscript(transcript: string): Array<{ time: number; speaker: string; text: string }> {
  const lines = transcript.split('\n');
  const result: Array<{ time: number; speaker: string; text: string }> = [];
  
  for (const line of lines) {
    const timeMatch = line.match(/^(\d{2}):(\d{2})/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1], 10);
      const seconds = parseInt(timeMatch[2], 10);
      const time = minutes * 60 + seconds;
      
      const speakerMatch = line.match(/(\d{2}:\d{2})\s+(.+?)：(.+)/);
      if (speakerMatch) {
        const speaker = speakerMatch[2].trim();
        const text = speakerMatch[3].trim();
        result.push({ time, speaker, text });
      } else {
        // If speaker format doesn't match, just add the rest as text with default speaker
        const restOfLine = line.replace(/^\d{2}:\d{2}\s+/, '');
        result.push({ time, speaker: '發言者', text: restOfLine });
      }
    }
  }
  
  return result;
}
