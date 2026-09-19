"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import Spline with SSR disabled since WebGL runs in the client browser
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center opacity-40">
      <div className="w-72 h-72 rounded-full border border-cyan-500/20 animate-ping" />
      <div className="w-96 h-96 rounded-full border border-blue-500/10 animate-pulse absolute" />
    </div>
  ),
});

interface SplineBackgroundProps {
  sceneUrl?: string;
  className?: string;
}

export function SplineBackground({
  sceneUrl = process.env.NEXT_PUBLIC_SPLINE_SCENE_URL || "https://prod.spline.design/YhOWmhUgFSww7Er1/scene.splinecode",
  className = "",
}: SplineBackgroundProps) {
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isIframe = sceneUrl.includes("my.spline.design") || sceneUrl.includes("app.spline.design");

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {isIframe ? (
        <iframe
          src={sceneUrl}
          className="w-full h-full border-0 pointer-events-auto"
          title="Spline 3D Interactive Scene"
          allow="accelerometer; autoplay; camera; gyroscope; payment"
        />
      ) : (
        !hasError && (
          <div className={`w-full h-full transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}>
            <Spline
              scene={sceneUrl}
              onLoad={() => setLoaded(true)}
              onError={(err) => {
                console.warn("Spline load error:", err);
                setHasError(true);
              }}
              className="w-full h-full pointer-events-auto [&>canvas]:!w-full [&>canvas]:!h-full [&>canvas]:!block"
            />
          </div>
        )
      )}
    </div>
  );
}

