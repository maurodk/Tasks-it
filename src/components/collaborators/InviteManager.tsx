/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Send,
  Users,
  Search,
  Filter,
  Copy,
  UserPlus,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  subsectorId: z.string().min(1, "Selecione um subsetor"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface Subsector {
  id: string;
  name: string;
}

interface Collaborator {
  id: string;
  full_name: string;
  email: string;
  subsector_name: string;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  token: string;
  subsector_name: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export function InviteManager() {
  const { profile } = useAuth();
  const [subsectors, setSubsectors] = useState<Subsector[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      subsectorId: "",
    },
  });

  const selectedSubsector = watch("subsectorId");

  // Fetch subsectors
  useEffect(() => {
    const fetchSubsectors = async () => {
      const { data, error } = await supabase
        .from("subsectors")
        .select("id, name")
        .eq("sector_id", profile?.sector_id)
        .order("name");

      if (error) throw error;

      setSubsectors(data || []);
    };

    fetchSubsectors();
  }, [profile]);

  // Fetch collaborators
  useEffect(() => {
    const fetchCollaborators = async () => {
      // Query para buscar profiles com subsectors
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            email,
            created_at,
            role,
            subsector_id,
            subsectors!left(id, name)
          `
        )
        .order("full_name");

      if (error) {
        throw error;
      }

      if (!data) {
        setCollaborators([]);
        return;
      }

      // Formatação dos dados com lógica para subsetores
      const formattedCollaborators: Collaborator[] = data.map((item) => {
        // Definir o nome do subsetor baseado na role
        let subsectorName = "Sem subsetor definido";

        if (item.role === "manager") {
          // Gestores sempre mostram "Gestão"
          subsectorName = "Gestão";
        } else if (item.subsectors?.name) {
          // Colaboradores mostram o subsetor real
          subsectorName = item.subsectors.name;
        }

        return {
          id: item.id,
          full_name: item.full_name,
          email: item.email,
          subsector_name: subsectorName,
          created_at: item.created_at,
        };
      });

      setCollaborators(formattedCollaborators);
    };

    fetchCollaborators();
  }, [profile]);

  // Refresh invitations function
  const refreshInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select(
          `
          id,
          email,
          token,
          created_at,
          expires_at,
          used_at,
          subsectors!inner(name)
        `
        )
        .eq("subsectors.sector_id", profile?.sector_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedInvitations =
        data?.map(
          (item: {
            id: string;
            email: string;
            token: string;
            created_at: string;
            expires_at: string;
            used_at: string | null;
            subsectors?: { name: string } | null;
          }) => ({
            id: item.id,
            email: item.email,
            token: item.token,
            subsector_name: item.subsectors?.name || "Sem subsetor",
            created_at: item.created_at,
            expires_at: item.expires_at,
            used_at: item.used_at,
          })
        ) || [];

      setInvitations(formattedInvitations);
    } catch (error) {
      console.error("Error refreshing invitations:", error);
    }
  };

  // Fetch pending invitations
  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const { data, error } = await supabase
          .from("invitations")
          .select(
            `
            id,
            email,
            token,
            created_at,
            expires_at,
            used_at,
            subsectors!inner(name)
          `
          )
          .eq("subsectors.sector_id", profile?.sector_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formattedInvitations =
          data?.map(
            (item: {
              id: string;
              email: string;
              token: string;
              created_at: string;
              expires_at: string;
              used_at: string | null;
              subsectors?: { name: string } | null;
            }) => ({
              id: item.id,
              email: item.email,
              token: item.token,
              subsector_name: item.subsectors?.name || "Sem subsetor",
              created_at: item.created_at,
              expires_at: item.expires_at,
              used_at: item.used_at,
            })
          ) || [];

        setInvitations(formattedInvitations);
      } catch (error) {
        console.error("Error fetching invitations:", error);
      }
    };

    if (profile?.sector_id) {
      fetchInvitations();
    }
  }, [profile?.sector_id]);

  const onSubmit = async (data: InviteFormData) => {
    setLoading(true);

    try {
      const { data: inviteData, error } = await supabase.rpc(
        "create_invitation" as any,
        {
          invitation_email: data.email,
          invitation_subsector_id: data.subsectorId,
        }
      );

      if (error) throw error;

      toast({
        title: "Convite criado com sucesso!",
        description: `Convite foi enviado para ${data.email}`,
      });

      reset();
      await refreshInvitations();
    } catch (error) {
      console.error("❌ Error creating invitation:", error);
      toast({
        title: "Erro ao criar convite",
        description:
          error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = async (token: string) => {
    const inviteLink = `${window.location.origin}/auth?token=${token}`;
    await navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Link copiado!",
      description:
        "O link do convite foi copiado para a área de transferência.",
    });
  };

  const resendInvitation = async (email: string, token: string) => {
    try {
      const { error } = await supabase.functions.invoke(
        "send-invitation-email",
        {
          body: {
            email,
            token,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Convite reenviado",
        description: `Convite foi reenviado para ${email}`,
      });
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Erro ao reenviar convite",
        description:
          error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (invitationId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", invitationId);

      if (error && error.message.includes("insufficient privileges")) {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "delete_invitation" as any,
          { invitation_id: invitationId }
        );

        if (rpcError) throw rpcError;
      } else if (error) {
        throw error;
      }

      toast({
        title: "Convite cancelado",
        description: `Convite para ${email} foi cancelado com sucesso.`,
      });

      // Refresh invitations list
      await refreshInvitations();
    } catch (error) {
      console.error("Error canceling invitation:", error);
      toast({
        title: "Erro ao cancelar convite",
        description:
          error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Filter collaborators
  const filteredCollaborators = collaborators.filter((collaborator) => {
    const matchesSearch =
      collaborator.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collaborator.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="collaborators" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="collaborators"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Colaboradores Ativos
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Convites e Novos Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collaborators" className="space-y-6">
          {/* Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Collaborators Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subsetor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollaborators.map((collaborator) => (
                  <TableRow key={collaborator.id}>
                    <TableCell className="font-medium">
                      {collaborator.full_name}
                    </TableCell>
                    <TableCell>{collaborator.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {collaborator.subsector_name}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCollaborators.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      {searchTerm
                        ? "Nenhum colaborador encontrado com os filtros aplicados"
                        : "Nenhum colaborador cadastrado"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="invites" className="space-y-6">
          {/* Invite Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Convidar Novo Colaborador
              </CardTitle>
              <CardDescription>
                Envie um convite para um novo colaborador se cadastrar no
                sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email do Colaborador</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colaborador@empresa.com"
                      {...register("email")}
                      disabled={loading}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subsector">Subsetor</Label>
                    <Select
                      value={selectedSubsector}
                      onValueChange={(value) => setValue("subsectorId", value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o subsetor" />
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
                      <p className="text-sm text-destructive">
                        {errors.subsectorId.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#09b230] hover:bg-[#09b230]/90 text-white"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" />
                  Criar Convite
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Convites Pendentes (
                  {invitations.filter((i) => !i.used_at).length})
                </CardTitle>
                <CardDescription>
                  Lista de convites enviados aguardando confirmação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Subsetor</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations
                        .filter((invitation) => !invitation.used_at)
                        .map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">
                              {invitation.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {invitation.subsector_name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(
                                invitation.created_at
                              ).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  new Date(invitation.expires_at) < new Date()
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }
                              >
                                {new Date(
                                  invitation.expires_at
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {new Date(invitation.expires_at) >=
                                  new Date() && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        copyInvitationLink(invitation.token)
                                      }
                                      className="h-8 px-2"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        resendInvitation(
                                          invitation.email,
                                          invitation.token
                                        )
                                      }
                                      className="h-8 px-2"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    cancelInvitation(
                                      invitation.id,
                                      invitation.email
                                    )
                                  }
                                  className="h-8 px-2 text-destructive hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
