import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

interface SessionWarningModalProps {
  isOpen: boolean;
  onExtendSession: () => void;
  warningTimeLeft: number;
}

export const SessionWarningModal = ({ 
  isOpen, 
  onExtendSession, 
  warningTimeLeft 
}: SessionWarningModalProps) => {
  const { signOut } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState(warningTimeLeft);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          signOut();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, signOut]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sessão expirando</DialogTitle>
          <DialogDescription>
            Sua sessão expirará em <strong>{formatTime(timeLeft)}</strong> por inatividade.
            Deseja continuar conectado?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={signOut}>
            Sair agora
          </Button>
          <Button onClick={onExtendSession}>
            Continuar conectado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};