"use client";

import { useEffect, useRef } from "react";

interface Props {
  streamRef: React.MutableRefObject<MediaStream | null>;
}

export default function LivePreview({ streamRef }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // ignore autoplay errors
      });
    }
  }, [streamRef.current]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-zinc-200 bg-black">
      <video
        autoPlay
        className="h-[260px] w-full bg-black object-contain"
        muted
        playsInline
        ref={videoRef}
      />
    </div>
  );
}
