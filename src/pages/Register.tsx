import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { RegisterForm } from "@/components/auth/RegisterForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTheme } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserPlus } from "lucide-react";

const Register = () => {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  // Function to get logo based on theme
  const getLogoSrc = () => {
    if (theme === "dark") {
      return "/logodark.png";
    } else if (theme === "light") {
      return "/logolight.png";
    } else {
      // System theme - check actual applied theme
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return isDark ? "/logodark.png" : "/logolight.png";
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/background.png')",
      }}
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto px-4">
        <Card className="glass-effect border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-[#09b230] to-[#4ade80] p-1 shadow-lg">
              <img
                src={getLogoSrc()}
                alt="VCA Construtora"
                className="w-full h-full object-contain rounded-full bg-white p-2"
              />
            </div>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <UserPlus className="h-5 w-5 text-[#09b230]" />
              Criar Conta
            </CardTitle>
            <CardDescription>
              Registre-se para acessar o sistema de gestão de atividades. Após o
              registro, aguarde aprovação de um gestor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
