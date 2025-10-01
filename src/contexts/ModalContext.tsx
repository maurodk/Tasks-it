import React, { createContext, useContext, useEffect, useState } from 'react';

interface ModalInfo {
  onClose: () => void;
  zIndex: number;
}

interface ModalContextType {
  registerModal: (id: string, onClose: () => void, zIndex?: number) => void;
  unregisterModal: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<Map<string, ModalInfo>>(new Map());

  const registerModal = (id: string, onClose: () => void, zIndex: number = 150) => {
    setModals(prev => new Map(prev).set(id, { onClose, zIndex }));
  };

  const unregisterModal = (id: string) => {
    setModals(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modals.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        // Fechar o modal com maior z-index (mais à frente)
        const modalWithHighestZIndex = Array.from(modals.values())
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        modalWithHighestZIndex?.onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modals]);

  return (
    <ModalContext.Provider value={{ registerModal, unregisterModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalManager() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalManager must be used within a ModalProvider');
  }
  return context;
}