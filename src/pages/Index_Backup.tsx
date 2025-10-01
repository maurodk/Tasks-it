import { useAuth } from "@/hooks/useAuth";

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Kanban
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Bem-vindo, {profile.full_name}!
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Em desenvolvimento...</h2>
          <p className="text-gray-600 dark:text-gray-400">
            O novo layout Kanban está sendo implementado. Por favor, aguarde.
          </p>
          
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded">
            <h3 className="font-medium mb-2">Informações do usuário:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400">
              <li>Nome: {profile.full_name}</li>
              <li>Email: {profile.email}</li>
              <li>Função: {profile.role}</li>
              <li>Setor ID: {profile.sector_id}</li>
              <li>Subsetor ID: {profile.subsector_id || 'Não definido'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
