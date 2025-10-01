import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Upload, Trash2, Loader2, X, RotateCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface AvatarEditorProps {
  currentAvatar?: string;
  userName: string;
  onAvatarChange: (file: File | null) => Promise<void>;
  loading?: boolean;
}

export function AvatarEditor({
  currentAvatar,
  userName,
  onAvatarChange,
  loading = false,
}: AvatarEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo de arquivo
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);

      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setIsOpen(true);
    },
    []
  );

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const processImage = useCallback(async (): Promise<File | null> => {
    if (!selectedFile || !previewUrl || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Definir tamanho do canvas (quadrado, 400x400)
        const size = 400;
        canvas.width = size;
        canvas.height = size;

        // Limpar canvas
        ctx.clearRect(0, 0, size, size);

        // Salvar estado do contexto
        ctx.save();

        // Mover origem para o centro
        ctx.translate(size / 2, size / 2);

        // Aplicar rotação
        ctx.rotate((rotation * Math.PI) / 180);

        // Calcular dimensões mantendo proporção
        let { width, height } = img;
        const aspectRatio = width / height;

        if (aspectRatio > 1) {
          // Paisagem
          height = size;
          width = size * aspectRatio;
        } else {
          // Retrato ou quadrado
          width = size;
          height = size / aspectRatio;
        }

        // Desenhar imagem centralizada
        ctx.drawImage(img, -width / 2, -height / 2, width, height);

        // Restaurar estado
        ctx.restore();

        // Converter canvas para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], selectedFile.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(processedFile);
            } else {
              resolve(null);
            }
          },
          "image/jpeg",
          0.9
        );
      };
      img.src = previewUrl;
    });
  }, [selectedFile, previewUrl, rotation]);

  const handleSave = async () => {
    const processedFile = await processImage();
    if (processedFile) {
      await onAvatarChange(processedFile);
      handleClose();
    }
  };

  const handleRemove = async () => {
    await onAvatarChange(null);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative group">
          <Avatar className="h-32 w-32">
            <AvatarImage src={currentAvatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>

          {/* Overlay com botões */}
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>

              {currentAvatar && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 w-8 p-0"
                  onClick={handleRemove}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Clique na foto para alterar
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou GIF. Máximo 5MB.
          </p>
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={loading}
        />
      </div>

      {/* Modal de edição */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Foto de Perfil</DialogTitle>
            <DialogDescription>
              Ajuste sua foto antes de salvar. Você pode rotacionar a imagem se
              necessário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewUrl && (
              <div className="flex justify-center">
                <div
                  className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-border"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={rotateImage}
                className="flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Rotacionar
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Upload className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Canvas oculto para processamento */}
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
