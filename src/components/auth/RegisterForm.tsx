import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, CheckCircle, Mail } from "lucide-react";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
    sectorId: z.string().min(1, "Selecione um setor"),
    subsectorId: z.string().min(1, "Selecione um subsetor"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  const [emailResent, setEmailResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sectors, setSectors] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
    }>
  >([]);
  const [subsectors, setSubsectors] = useState<
    Array<{
      id: string;
      name: string;
      sector_id: string;
    }>
  >([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      subsectorId: "",
    },
  });

  const sectorId = watch("sectorId");
  const subsectorId = watch("subsectorId");

  useEffect(() => {
    // Fetch sectors for registration
    const fetchSectors = async () => {
      try {
        const { data } = await supabase
          .from("sectors")
          .select("id, name, description")
          .order("name");
        setSectors(data || []);
      } catch (err) {
        console.error("Error fetching sectors:", err);
      }
    };

    fetchSectors();
  }, []);

  useEffect(() => {
    // Fetch subsectors when sector changes
    const fetchSubsectors = async () => {
      if (!sectorId) {
        setSubsectors([]);
        setValue("subsectorId", "");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("subsectors")
          .select("id, name, sector_id")
          .eq("sector_id", sectorId)
          .order("name");

        if (error) {
          console.error("Error fetching subsectors:", error);
          setSubsectors([]);
          return;
        }

        setSubsectors(data || []);

        // Clear subsector selection when sector changes
        setValue("subsectorId", "");
      } catch (err) {
        console.error("Error fetching subsectors:", err);
        setSubsectors([]);
      }
    };

    fetchSubsectors();
  }, [sectorId, setValue]);

  // Cooldown timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const resendConfirmationEmail = async () => {
    if (!registeredEmail || resendCooldown > 0) return;

    setResendingEmail(true);
    setError(null);
    setEmailResent(false);

    try {
      const redirectUrl = `${window.location.origin}/auth`;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: registeredEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setError(`Erro ao reenviar email: ${error.message}`);
      } else {
        setEmailResent(true);
        setResendCooldown(60); // 60 seconds cooldown
      }
    } catch (err) {
      setError("Erro inesperado ao reenviar email. Tente novamente.");
      console.error("Resend email error:", err);
    } finally {
      setResendingEmail(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.fullName,
            sector_id: data.sectorId,
            subsector_id:
              data.subsectorId && data.subsectorId !== "none"
                ? data.subsectorId
                : null,
            is_pending: true, // Marca como pendente de aprovação
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          setError("Este email já está registrado");
        } else {
          setError(error.message);
        }
        return;
      }

      setRegisteredEmail(data.email);
      setSuccess(true);
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold">Registro realizado!</h3>
          <p className="text-muted-foreground">
            Verifique seu email ({registeredEmail}) para confirmar sua conta
            (veja a pasta de spam também). Após a confirmação, um gestor irá
            aprovar seu acesso.
          </p>
          {emailResent && (
            <Alert className="mt-4">
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-green-600">
                Email de confirmação reenviado com sucesso!
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Não recebeu o email?</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resendConfirmationEmail}
            disabled={resendingEmail || resendCooldown > 0}
          >
            {resendingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reenviando...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Aguarde {resendCooldown}s
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Reenviar email de confirmação
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo</Label>
        <Input
          id="fullName"
          placeholder="Seu nome completo"
          className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]/20 focus-visible:border-[#09b230]/70"
          {...register("fullName")}
          disabled={loading}
        />
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName.message}</p>
        )}
      </div>

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
        <Label htmlFor="sectorId">Setor</Label>
        <Select
          value={sectorId}
          onValueChange={(value) => setValue("sectorId", value)}
        >
          <SelectTrigger
            className={`focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]/20 focus-visible:border-[#09b230]/70 ${
              errors.sectorId ? "border-destructive" : ""
            }`}
          >
            <SelectValue placeholder="Selecione seu setor" />
          </SelectTrigger>
          <SelectContent>
            {sectors.map((sector) => (
              <SelectItem key={sector.id} value={sector.id}>
                {sector.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.sectorId && (
          <p className="text-sm text-destructive">{errors.sectorId.message}</p>
        )}
      </div>

      {/* Mostrar sempre o campo de subsetor quando um setor for selecionado */}
      {sectorId && (
        <div className="space-y-2">
          <Label htmlFor="subsectorId">Subsetor</Label>
          <Select
            value={subsectorId || ""}
            onValueChange={(value) => setValue("subsectorId", value)}
          >
            <SelectTrigger className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]/20 focus-visible:border-[#09b230]/70">
              <SelectValue placeholder="Selecione um subsetor" />
            </SelectTrigger>
            <SelectContent>
              {subsectors.map((subsector) => (
                <SelectItem key={subsector.id} value={subsector.id}>
                  {subsector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.subsectorId && (
            <p className="text-xs text-red-600">{errors.subsectorId.message}</p>
          )}
          {subsectors.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum subsetor disponível para este setor
            </p>
          )}
        </div>
      )}

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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirme sua senha"
            className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]/20 focus-visible:border-[#09b230]/70"
            {...register("confirmPassword")}
            disabled={loading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={loading}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        style={{ backgroundColor: "#09b230", borderColor: "#09b230" }}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        Registre-se para começar a usar o VCA TASKS.
      </p>
    </form>
  );
};
