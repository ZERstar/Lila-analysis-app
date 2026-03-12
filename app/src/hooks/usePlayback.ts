import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export function usePlayback() {
  const { isPlaying, playbackSpeed, playbackTime, setPlaybackTime, setIsPlaying } = useStore();
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = now;

      const newTime = playbackTime + dt * playbackSpeed * 0.05; // ~20s full playback at 1x
      if (newTime >= 1) {
        setPlaybackTime(1);
        setIsPlaying(false);
        return;
      }
      setPlaybackTime(newTime);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, playbackSpeed]);
}
