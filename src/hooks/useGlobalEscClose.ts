import { useEffect, useRef } from 'react';
import { useModalManager } from '@/contexts/ModalContext';

export function useGlobalEscClose(isOpen: boolean, onClose: () => void, zIndex: number = 150) {
  const { registerModal, unregisterModal } = useModalManager();
  const modalIdRef = useRef<string>();

  useEffect(() => {
    if (isOpen) {
      const modalId = `modal-${Date.now()}-${Math.random()}`;
      modalIdRef.current = modalId;
      registerModal(modalId, onClose, zIndex);
      
      return () => {
        unregisterModal(modalId);
      };
    } else if (modalIdRef.current) {
      unregisterModal(modalIdRef.current);
      modalIdRef.current = undefined;
    }
  }, [isOpen, onClose, zIndex, registerModal, unregisterModal]);

  useEffect(() => {
    return () => {
      if (modalIdRef.current) {
        unregisterModal(modalIdRef.current);
      }
    };
  }, [unregisterModal]);
}