import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasLoggedOut, setWasLoggedOut] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Detectar quando usuário é deslogado automaticamente
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && !session && loading) {
        // Se foi deslogado durante o loading, significa que não tem perfil
        setWasLoggedOut(true);
        setError(
          "Este email não está cadastrado no sistema. Entre em contato com o administrador para ter seu acesso liberado."
        );
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loading]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    setWasLoggedOut(false);

    try {
      // Fazer login diretamente sem verificação prévia de perfil
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Email ou senha incorretos");
        } else if (error.message.includes("Email not confirmed")) {
          setError(
            "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada e clique no link de confirmação."
          );
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      // Verificar se o email foi confirmado
      if (authData.user && !authData.user.email_confirmed_at) {
        setError(
          "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada e clique no link de confirmação."
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      // Verificar perfil e aprovação antes de seguir
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, is_approved")
          .eq("id", authData.user.id)
          .single();

        if (profileError || !profile) {
          setError(
            "Este email não está cadastrado no sistema. Entre em contato com o administrador para ter seu acesso liberado."
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (profile.is_approved === false) {
          setError(
            "Seu acesso ainda não foi aprovado pelo gestor. Tente novamente mais tarde."
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Login bem-sucedido
        window.location.href = "/";
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
      console.error("Login error:", err);
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setLoading(true);
    setError(null);
    const testEmail = "test@example.com";
    const testPassword = "password";

    try {
      // 1. Tenta fazer login
      let { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });

      // 2. Se o usuário não existe, cria um novo
      if (
        signInError &&
        (signInError.message.includes("Invalid login credentials") ||
          // Adicionado para lidar com o caso em que o usuário existe, mas o e-mail não foi confirmado
          signInError.message.includes("Email not confirmed"))
      ) {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
          });

        // Ignora o erro se o usuário já existir, mas continua para a aprovação
        if (
          signUpError &&
          !signUpError.message.includes("User already registered")
        ) {
          throw signUpError;
        }

        // Força a aprovação do usuário de teste no banco
        const userToApprove = signUpData?.user || authData?.user;
        if (userToApprove) {
          await supabase
            .from("profiles")
            .update({ is_approved: true, role: "guest" }) // Aprovado como GUEST
            .eq("id", userToApprove.id);
        }

        // Tenta logar novamente após o cadastro
        const { data: retryAuthData, error: retrySignInError } =
          await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });

        if (retrySignInError) throw retrySignInError;
        authData = retryAuthData;
      } else if (signInError) {
        throw signInError;
      }

      // Login bem-sucedido
      if (authData.user) {
        window.location.href = "/";
      }
    } catch (err) {
      const error = err as Error;
      setError(`Erro no login de teste: ${error.message}`);
      console.error("Test login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]/20 focus-visible:border-[#09b230]/70"
          {...register("email")}
          disabled={loading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Sua senha"
            className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]/20 focus-visible:border-[#09b230]/70"
            {...register("password")}
            disabled={loading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        style={{ backgroundColor: "#09b230", borderColor: "#09b230" }}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>

      {/* Botão de login para ambiente de desenvolvimento */}
      {window.location.hostname === "localhost" && (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={handleTestLogin}
          disabled={loading}
        >
          {loading ? "Aguarde..." : "Entrar como Usuário de Teste (localhost)"}
        </Button>
      )}
    </form>
  );
};
