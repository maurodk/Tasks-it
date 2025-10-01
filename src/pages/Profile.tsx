import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Loader2,
  Shield,
  Users,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/ui/use-toast";
import { AvatarEditor } from "@/components/ui/avatar-editor";

const profileSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z
      .string()
      .min(6, "Nova senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const Profile = () => {
  const { profile } = useAuth();
  const { setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [sectorName, setSectorName] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name || "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Fetch sector information
  useEffect(() => {
    const fetchSectorInfo = async () => {
      if (!profile?.sector_id) return;

      try {
        const { data, error } = await supabase
          .from("sectors")
          .select("name")
          .eq("id", profile.sector_id)
          .single();

        if (error) throw error;
        setSectorName(data.name);
      } catch (error) {
        console.error("Error fetching sector:", error);
      }
    };

    fetchSectorInfo();
  }, [profile?.sector_id]);

  if (!profile) return null;

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: data.fullName })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: data.fullName });

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (file: File | null) => {
    setAvatarLoading(true);

    try {
      if (!file) {
        // Remover avatar
        if (profile.avatar_url) {
          // Tentar remover arquivo antigo do storage
          const urlParts = profile.avatar_url.split("/");
          const oldFileName = urlParts[urlParts.length - 1];
          const oldFilePath = `${profile.id}/${oldFileName}`;
          if (oldFileName) {
            await supabase.storage.from("avatars").remove([oldFilePath]);
          }
        }

        // Atualizar perfil removendo avatar_url
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        setProfile({ ...profile, avatar_url: null });

        toast({
          title: "Foto removida",
          description: "Sua foto de perfil foi removida com sucesso.",
        });

        return;
      }

      // Upload nova imagem
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`; // Usar estrutura de pasta por usuário

      // Remover arquivo antigo se existir
      if (profile.avatar_url) {
        const oldFileName = profile.avatar_url.split("/").pop();
        if (oldFileName && oldFileName !== fileName) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      // Upload novo arquivo
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Atualizar perfil com nova URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: data.publicUrl });

      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi alterada com sucesso.",
      });
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordLoading(true);

    try {
      // Verificar senha atual fazendo login temporário
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error("Senha atual incorreta");
      }

      // Alterar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      setShowPasswordModal(false);
      resetPasswordForm();

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
    } catch (error: unknown) {
      console.error("Error updating password:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Picture */}
  <Card className="dark:bg-[#1f1f1f] dark:border-gray-800">
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Gerencie sua foto de perfil com ferramentas de edição
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarEditor
              currentAvatar={profile.avatar_url || undefined}
              userName={profile.full_name}
              onAvatarChange={handleAvatarChange}
              loading={avatarLoading}
            />
          </CardContent>
        </Card>

        {/* Basic Information */}
  <Card className="dark:bg-[#1f1f1f] dark:border-gray-800">
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Suas informações pessoais e dados da conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  disabled={loading}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Email não pode ser alterado
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="bg-[#09b230] hover:bg-[#09b230]/90 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Role & Sector */}
    <Card className="dark:bg-[#1f1f1f] dark:border-gray-800">
          <CardHeader>
            <CardTitle>Função e Setor</CardTitle>
            <CardDescription>Suas informações organizacionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg dark:bg-[#161616] dark:border dark:border-gray-800">
                {profile.role === "manager" ? (
                  <Shield className="h-4 w-4 text-primary" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {profile.role === "manager" ? "Gestor" : "Colaborador"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Setor</Label>
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#09b230]/10 to-[#09b230]/5 border border-[#09b230]/20 rounded-lg dark:bg-[#161616] dark:border-gray-800">
                <div className="flex items-center justify-center w-10 h-10 bg-[#09b230]/10 rounded-full">
                  <Building2 className="h-5 w-5 text-[#09b230]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#09b230] uppercase tracking-wide">
                    {sectorName || "Carregando..."}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Setor de Atuação
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
    <Card className="dark:bg-[#1f1f1f] dark:border-gray-800">
          <CardHeader>
            <CardTitle>Segurança da Conta</CardTitle>
            <CardDescription>
              Configurações de segurança e senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog
              open={showPasswordModal}
              onOpenChange={setShowPasswordModal}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-[#09b230] text-[#09b230] hover:bg-[#09b230] hover:text-white"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Alterar Senha
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Alterar Senha</DialogTitle>
                  <DialogDescription>
                    Digite sua senha atual e escolha uma nova senha segura.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleSubmitPassword(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Digite sua senha atual"
                        {...registerPassword("currentPassword")}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-sm text-red-500">
                        {passwordErrors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Digite sua nova senha"
                        {...registerPassword("newPassword")}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="text-sm text-red-500">
                        {passwordErrors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirmar Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirme sua nova senha"
                        {...registerPassword("confirmPassword")}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-sm text-red-500">
                        {passwordErrors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordModal(false);
                        resetPasswordForm();
                      }}
                      disabled={passwordLoading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={passwordLoading}
                      className="bg-[#09b230] hover:bg-[#08a02c]"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Alterando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Alterar Senha
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <p className="text-sm text-muted-foreground">
              Recomendamos alterar sua senha periodicamente para manter sua
              conta segura.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assinatura do Desenvolvedor - reduzida */}
      <div className="mt-8 pt-6 border-t border-border/30">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 mb-1">
            Developed By:
          </p>
          <div className="relative">
            <p className="text-[12px] font-serif italic text-muted-foreground/80 tracking-wide">
              Carlos Mauricio Jr.
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent mt-2 mx-auto max-w-xs"></div>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            Full Stack Developer
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
