import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SmoothTransitionProps {
  loading: boolean;
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
  minLoadingTime?: number; // Tempo mínimo de loading em ms (padrão: 500ms)
}

/**
 * Componente que gerencia transições suaves entre estados de loading e conteúdo
 * Evita o "piscar" ao implementar um tempo mínimo de loading e transições CSS
 */
export function SmoothTransition({
  loading,
  children,
  fallback,
  className,
  minLoadingTime = 500,
}: SmoothTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [loadingStartTime] = useState(Date.now());

  useEffect(() => {
    if (loading) {
      setIsVisible(true);
      setShowContent(false);
    } else {
      const elapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      setTimeout(() => {
        setShowContent(true);
        // Pequeno delay para suavizar a transição
        setTimeout(() => setIsVisible(false), 150);
      }, remainingTime);
    }
  }, [loading, loadingStartTime, minLoadingTime]);

  return (
    <div className={cn("relative", className)}>
      {/* Estado de loading */}
      <div
        className={cn(
          "transition-opacity duration-300 ease-in-out",
          isVisible && !showContent
            ? "opacity-100"
            : "opacity-0 pointer-events-none absolute inset-0"
        )}
      >
        {fallback}
      </div>

      {/* Conteúdo principal */}
      <div
        className={cn(
          "transition-opacity duration-300 ease-in-out",
          showContent ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {children}
      </div>
    </div>
  );
}
