import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/formatTime";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function AudioPlayer({
  src,
  onTimeUpdate,
  onPlayStateChange,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    
    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });
    
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    });
    
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    });
    
    audio.volume = volume / 100;
    
    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadedmetadata", () => {});
      audio.removeEventListener("timeupdate", () => {});
      audio.removeEventListener("ended", () => {});
    };
  }, [src, onTimeUpdate, onPlayStateChange]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
    onPlayStateChange?.(!isPlaying);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(
      audioRef.current.duration,
      audioRef.current.currentTime + 15
    );
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume / 100;
    setVolume(newVolume);
  };

  // Method to seek to a specific time (for transcript navigation)
  const seekToTime = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    
    // Start playing if not already playing
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
      onPlayStateChange?.(true);
    }
  };

  // Expose seekToTime method
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).seekToTimestamp = seekToTime;
    }
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBackward}
            title="向後15秒"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full bg-primary text-white hover:bg-blue-600"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-1" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            title="向前15秒"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-gray-600" />
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={1}
            className="w-20"
            onValueChange={handleVolumeChange}
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm font-mono text-gray-600 min-w-[40px]">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          className="flex-1"
          onValueChange={handleSeek}
        />
        <span className="text-sm font-mono text-gray-600 min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
