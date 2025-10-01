import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ModalProvider } from "@/contexts/ModalContext";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import Index from "./pages/Index";
import IndexDebug from "./pages/IndexDebug";
import IndexSimple from "./pages/IndexSimple";
import { Archived } from "./pages/Archived";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Subsector from "./pages/Subsector";
import NotFound from "./pages/NotFound";
import CollaboratorManagement from "./pages/CollaboratorManagement";

const queryClient = new QueryClient();

const AppContent = () => {
  useAutoLogout();
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Protegidas */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route index element={<IndexSimple />} />
          <Route path="debug" element={<IndexDebug />} />
          <Route path="original" element={<Index />} />
          {/** removed MyActivities route */}
          <Route path="archived" element={<Archived />} />
          <Route path="profile" element={<Profile />} />
          <Route path="subsector/:id" element={<Subsector />} />
          <Route
            path="collaborator-management"
            element={<CollaboratorManagement />}
          />
        </Route>

        {/* Rota Pública de Autenticação */}
        <Route path="/auth" element={<Auth />} />

        {/* Rota de fallback no final */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="week-flow-theme">
      <ModalProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </ModalProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
