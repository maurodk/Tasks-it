import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";

const INACTIVITY_TIME = 1 * 60 * 60 * 1000; // 1 hora em ms
const WARNING_TIME = 5 * 60 * 1000; // 5 minutos antes do logout
const LAST_ACTIVITY_KEY = "vca_last_activity";

export const useAutoLogout = () => {
  const { signOut, user } = useAuthStore();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const checkIntervalRef = useRef<NodeJS.Timeout>();

  const updateLastActivity = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  }, [user]);

  const getLastActivity = useCallback(() => {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored) : Date.now();
  }, []);

  const checkInactivity = useCallback(async () => {
    if (!user) return;

    const lastActivity = getLastActivity();
    const timeSinceActivity = Date.now() - lastActivity;

    if (timeSinceActivity >= INACTIVITY_TIME) {
      toast({
        title: "Sessão expirada",
        description: "Você foi desconectado por inatividade.",
        variant: "destructive",
      });
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      await signOut();
      return;
    }

    const timeUntilWarning = INACTIVITY_TIME - WARNING_TIME - timeSinceActivity;
    const timeUntilLogout = INACTIVITY_TIME - timeSinceActivity;

    // Limpa timers existentes
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    // Timer de aviso
    if (timeUntilWarning > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        toast({
          title: "Sessão expirando",
          description:
            "Sua sessão expirará em 5 minutos por inatividade. Mova o mouse para continuar.",
          variant: "destructive",
        });
      }, timeUntilWarning);
    }

    // Timer de logout
    if (timeUntilLogout > 0) {
      timeoutRef.current = setTimeout(async () => {
        await checkInactivity();
      }, timeUntilLogout);
    }
  }, [user, signOut, getLastActivity]);

  const resetTimer = useCallback(() => {
    updateLastActivity();
    checkInactivity();
  }, [updateLastActivity, checkInactivity]);

  useEffect(() => {
    if (!user) {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      return;
    }

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => resetTimer();

    // Adiciona listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Verifica inatividade ao carregar a página
    checkInactivity();

    // Verifica periodicamente (a cada 30 segundos)
    checkIntervalRef.current = setInterval(checkInactivity, 30000);

    // If the window/tab is closed, force sign-out so the user must re-login next time
    const handleBeforeUnload = () => {
      try {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        // Fire-and-forget sign out; browsers won't wait for async, but this clears local state
        signOut();
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Remove listeners
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });

      // Limpa timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (checkIntervalRef.current) clearTimeout(checkIntervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, resetTimer, checkInactivity, signOut]);
};
