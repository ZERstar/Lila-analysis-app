import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export function usePlayback() {
  const isPlaying = useStore(s => s.isPlaying);
  const playbackSpeed = useStore(s => s.playbackSpeed);
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

      const currentTime = useStore.getState().playbackTime;
      const newTime = currentTime + dt * playbackSpeed * 0.05; // ~20s full playback at 1x
      if (newTime >= 1) {
        useStore.getState().setPlaybackTime(1);
        useStore.getState().setIsPlaying(false);
        return;
      }
      useStore.getState().setPlaybackTime(newTime);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, playbackSpeed]);
}
