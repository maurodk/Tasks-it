import { useState } from "react";
import { useGlobalEscClose } from "@/hooks/useGlobalEscClose";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const subsectorSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional(),
});

type SubsectorFormData = z.infer<typeof subsectorSchema>;

interface SubsectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubsectorCreated?: () => void;
}

export function SubsectorModal({
  open,
  onOpenChange,
  onSubsectorCreated,
}: SubsectorModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  useGlobalEscClose(open, () => onOpenChange(false));

  const form = useForm<SubsectorFormData>({
    resolver: zodResolver(subsectorSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: SubsectorFormData) => {
    if (!profile?.sector_id) {
      toast({
        title: "Erro",
        description: "Setor não identificado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("subsectors").insert({
        name: data.name,
        description: data.description || null,
        sector_id: profile.sector_id,
      });

      if (error) throw error;

      toast({
        title: "Subsetor criado",
        description: `O subsetor "${data.name}" foi criado com sucesso.`,
      });

      form.reset();
      onSubsectorCreated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao criar subsetor",
        description:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Subsetor</DialogTitle>
          <DialogDescription>
            Crie um novo subsetor para organizar melhor suas atividades.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Subsetor</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Desenvolvimento, Marketing, Vendas"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o propósito e responsabilidades deste subsetor"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Subsetor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
