import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuthFinal";
import { Navigate, useSearchParams } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const Auth = () => {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("login");

  // Check if there's a token in the URL and switch to register tab
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setActiveTab("register");
    }
  }, [searchParams]);

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

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img
            src={getLogoSrc()}
            alt="VCA Logo"
            className="h-16 w-auto mx-auto mb-2"
          />
          <p className="text-muted-foreground mt-2">
            Sistema de Gerenciamento de Atividades
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Bem-vindo</CardTitle>
            <CardDescription>
              Entre em sua conta ou registre-se para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Registrar</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="space-y-4 mt-4">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register" className="space-y-4 mt-4">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
