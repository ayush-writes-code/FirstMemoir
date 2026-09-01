'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const HERO_VIDEOS = [
  '/videos/16292345_3840_2160_60fps.mp4',
  '/videos/7393979-uhd_3840_2160_30fps.mp4',
  '/videos/14562400_2560_1440_30fps.mp4',
  '/videos/15867761_3840_2160_25fps.mp4',
  '/videos/5923591-hd_1920_1080_30fps.mp4'
];

export function HeroVideoRotation({ fallbackPoster }: { fallbackPoster: string }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [activePlayer, setActivePlayer] = useState<0 | 1>(0);
  
  // Track the source of each player independently.
  // This prevents the outgoing video from instantly going black when its source changes
  // before the CSS fade-out transition has time to complete.
  const [player0Src, setPlayer0Src] = useState(HERO_VIDEOS[0]);
  const [player1Src, setPlayer1Src] = useState(HERO_VIDEOS[1]);

  const currentIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const player0Ref = useRef<HTMLVideoElement>(null);
  const player1Ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => {
      mediaQuery.removeEventListener('change', listener);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // When active player changes, explicitly play the new active video.
  useEffect(() => {
    if (reducedMotion || !mounted) return;
    
    const currentRef = activePlayer === 0 ? player0Ref.current : player1Ref.current;
    if (currentRef) {
      // Ensure the video is reset to the beginning just in case, though it should be fresh
      currentRef.currentTime = 0;
      currentRef.play().catch((err) => {
        console.warn("Autoplay was prevented:", err);
      });
    }
  }, [activePlayer, reducedMotion, mounted]);

  if (!mounted || reducedMotion) {
    return (
      <Image 
        src={fallbackPoster} 
        alt="Beautifully framed photo on a wall"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-90"
        unoptimized
      />
    );
  }

  const handleVideoEnded = () => {
    const nextIdx = (currentIndexRef.current + 1) % HERO_VIDEOS.length;
    const nextNextIdx = (currentIndexRef.current + 2) % HERO_VIDEOS.length;
    
    currentIndexRef.current = nextIdx;
    
    if (activePlayer === 0) {
      setActivePlayer(1);
      // Wait 1000ms for Player 0 to visually fade out before changing its src.
      // This allows it to stay paused on its final frame during the crossfade.
      timeoutRef.current = setTimeout(() => {
        setPlayer0Src(HERO_VIDEOS[nextNextIdx]);
      }, 1000);
    } else {
      setActivePlayer(0);
      timeoutRef.current = setTimeout(() => {
        setPlayer1Src(HERO_VIDEOS[nextNextIdx]);
      }, 1000);
    }
  };

  return (
    <>
      <Image 
        src={fallbackPoster} 
        alt="Beautifully framed photo on a wall"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-90 -z-10"
        unoptimized
      />
      
      {/* Player 0 */}
      <video
        ref={player0Ref}
        src={player0Src}
        playsInline
        muted
        preload="auto"
        onEnded={activePlayer === 0 ? handleVideoEnded : undefined}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
          activePlayer === 0 ? 'opacity-90 z-10' : 'opacity-0 z-0'
        }`}
      />
      
      {/* Player 1 */}
      <video
        ref={player1Ref}
        src={player1Src}
        playsInline
        muted
        preload="auto"
        onEnded={activePlayer === 1 ? handleVideoEnded : undefined}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
          activePlayer === 1 ? 'opacity-90 z-10' : 'opacity-0 z-0'
        }`}
      />
    </>
  );
}
