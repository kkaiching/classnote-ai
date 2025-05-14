export function formatTime(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '00:00';
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '00:00';
  }
  
  if (seconds < 3600) {
    // Less than one hour, format as MM:SS
    return formatTime(seconds);
  } else {
    // For longer durations, format as HH:MM:SS
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}
