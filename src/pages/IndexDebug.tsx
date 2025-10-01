import { useAuth } from "@/hooks/useAuth";
import { useIndexActivities } from "@/hooks/useIndexActivities";

const IndexDebug = () => {
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth();
  const { activities, loading: activitiesLoading } = useIndexActivities();

  console.log("=== INDEX DEBUG ===");
  console.log("Auth Loading:", authLoading);
  console.log("Activities Loading:", activitiesLoading);
  console.log("Is Authenticated:", isAuthenticated);
  console.log("User:", user);
  console.log("Profile:", profile);
  console.log("Activities:", activities);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Debug da Página Index</h1>
      
      <div className="grid gap-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Estado da Autenticação</h2>
          <p>Loading: {authLoading ? "SIM" : "NÃO"}</p>
          <p>Authenticated: {isAuthenticated ? "SIM" : "NÃO"}</p>
          <p>User ID: {user?.id || "N/A"}</p>
          <p>User Email: {user?.email || "N/A"}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Perfil do Usuário</h2>
          <p>Nome: {profile?.full_name || "N/A"}</p>
          <p>Role: {profile?.role || "N/A"}</p>
          <p>Setor ID: {profile?.sector_id || "FALTANDO!"}</p>
          <p>Subsetor ID: {profile?.subsector_id || "N/A"}</p>
          <p>Aprovado: {profile?.is_approved !== false ? "SIM" : "NÃO"}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Atividades</h2>
          <p>Loading: {activitiesLoading ? "SIM" : "NÃO"}</p>
          <p>Total: {activities?.length || 0}</p>
          {activities?.length > 0 && (
            <div className="mt-2">
              <h3 className="font-medium">Primeiras 3 atividades:</h3>
              {activities.slice(0, 3).map((activity) => (
                <p key={activity.id} className="text-sm">
                  - {activity.title} ({activity.status})
                </p>
              ))}
            </div>
          )}
        </div>

        {!profile?.sector_id && (
          <div className="p-4 border border-red-500 rounded bg-red-50">
            <h2 className="font-semibold text-red-700 mb-2">⚠️ PROBLEMA IDENTIFICADO</h2>
            <p className="text-red-600">
              O perfil do usuário não possui um setor_id definido. 
              Isso impede o carregamento das atividades.
            </p>
          </div>
        )}

        {profile?.is_approved === false && (
          <div className="p-4 border border-yellow-500 rounded bg-yellow-50">
            <h2 className="font-semibold text-yellow-700 mb-2">⚠️ USUÁRIO NÃO APROVADO</h2>
            <p className="text-yellow-600">
              O usuário não foi aprovado ainda pelo gestor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndexDebug;