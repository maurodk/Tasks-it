import { useAuth } from "@/hooks/useAuthSimple";
import { KanbanBoardSimple } from "@/components/kanban/KanbanBoardSimple";

const Index = () => {
  const { profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#09b230] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#09b230] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-6 px-4">
        <KanbanBoardSimple subsectorId={profile.subsector_id} />
      </div>
    </div>
  );
};

export default Index;
