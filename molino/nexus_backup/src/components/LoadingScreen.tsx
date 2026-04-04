"use client";

import { useEffect, useState } from "react";

export function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-[#0A001F] flex flex-col items-center justify-center z-[9999] transition-opacity duration-500">
      <div className="font-display text-2xl font-black text-[#00E5FF] drop-shadow-[0_0_10px_rgba(0,229,255,0.6)] mb-6 tracking-widest">
        ENG.INTEL_SYS
      </div>
      <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#1A53FF] animate-loading" />
      </div>
      <div className="font-mono-tech text-[10px] text-white/40 mt-4 tracking-widest uppercase">
        Conectando con servidor...
      </div>
    </div>
  );
}
