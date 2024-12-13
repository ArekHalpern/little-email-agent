"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LoadingBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setVisible(false), 200); // Hide after animation
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return visible ? (
    <div className="fixed top-0 left-0 right-0 h-1 z-50">
      <div
        className={cn(
          "h-full bg-primary transition-all duration-500 ease-in-out",
          progress === 100 && "opacity-0"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  ) : null;
}
