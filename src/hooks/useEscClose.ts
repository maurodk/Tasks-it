import { useEffect } from "react";

export function useEscClose(isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);
}
