import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Building2,
  ChevronDown,
  Plus,
  FolderOpen,
  Home,
  Archive,
  Sparkles,
  Activity,
  Users,
  BarChart3,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuthFinal";
import { supabase } from "@/lib/supabase";
import { SubsectorModal } from "@/components/subsectors/SubsectorModal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTheme } from "@/components/theme/theme-provider";

interface Subsector {
  id: string;
  name: string;
  description?: string;
}
export function AppSidebar() {
  const { state } = useSidebar();
  const { profile, isManager } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const [subsectors, setSubsectors] = useState<Subsector[]>([]);
  const [subsetoresOpen, setSubsetoresOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showSubsectorModal, setShowSubsectorModal] = useState(false);
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-[#09b230]/20 text-[#09b230] font-medium border-r-2 border-[#09b230]"
      : "hover:bg-[#09b230]/10 text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:text-[#09b230]";

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

  const fetchSubsectors = useCallback(async () => {
    if (!profile?.sector_id) {
      setLoading(false);
      return;
    }
    try {
      if (profile.role === "manager") {
        // Gestores veem todos os subsetores do setor
        const { data, error } = await supabase
          .from("subsectors")
          .select("*")
          .eq("sector_id", profile.sector_id)
          .order("name");

        if (error) throw error;
        setSubsectors(data || []);
      } else if (profile.role === "collaborator") {
        // Colaboradores veem seus múltiplos subsetores
        const { data: profileSubsectors, error: psError } = await supabase
          .from("profile_subsectors")
          .select(`
            subsector_id,
            subsectors (
              id,
              name,
              description
            )
          `)
          .eq("profile_id", profile.id);

        if (psError) throw psError;

        const multipleSubsectors = profileSubsectors
          ?.map(ps => ps.subsectors)
          .filter(Boolean) || [];

        // Se não tem múltiplos subsetores, usar o subsetor principal
        if (multipleSubsectors.length === 0 && profile.subsector_id) {
          const { data: primarySubsector, error: primaryError } = await supabase
            .from("subsectors")
            .select("*")
            .eq("id", profile.subsector_id)
            .single();

          if (!primaryError && primarySubsector) {
            setSubsectors([primarySubsector]);
          }
        } else {
          setSubsectors(multipleSubsectors as Subsector[]);
        }
      }
    } catch (error) {
      console.error("Error fetching subsectors:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.sector_id, profile?.role, profile?.subsector_id, profile?.id]);

  useEffect(() => {
    fetchSubsectors();
  }, [fetchSubsectors]);

  const handleSubsectorCreated = () => {
    fetchSubsectors();
    setShowSubsectorModal(false);
  };
  return (
    <Sidebar
      className="border-r border-gray-200 dark:border-gray-800 bg-card dark:bg-[#1f1f1f]"
      collapsible="offcanvas"
    >
      <SidebarContent className="p-2 ">
        {/* Logo */}
        <div className="px-2 py-4 border-b border-gray-200 dark:border-gray-800 mb-4 flex justify-center">
          <div className="flex justify-center w-full">
            <img
              src={getLogoSrc()}
              alt="VCA TASKS"
              className="w-full h-auto max-w-[220px] object-contain"
            />
          </div>
        </div>

        {/* Navegação Principal */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/" className={getNavCls}>
                    <Home className="h-4 w-4" />
                    <span className="ml-2">Pagina Inicial</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/** removed MyActivities from sidebar */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/archived" className={getNavCls}>
                    <Archive className="h-4 w-4" />
                    <span className="ml-2">Arquivados</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isManager && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink
                      to="/collaborator-management"
                      className={getNavCls}
                    >
                      <Users className="h-4 w-4" />
                      <span className="ml-2">Gestão de Equipe</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subsetores */}
        {!loading &&
          (isManager ||
            (profile?.role === "collaborator" && profile?.subsector_id)) && (
            <Collapsible open={subsetoresOpen} onOpenChange={setSubsetoresOpen}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between">
                    <SidebarGroupLabel className="flex items-center cursor-pointer hover:text-[#09b230] transition-colors">
                      Subsetores
                      <ChevronDown
                        className={`h-4 w-4 ml-2 transition-transform ${
                          subsetoresOpen ? "rotate-180" : ""
                        }`}
                      />
                    </SidebarGroupLabel>
                    {isManager && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-[#09b230] hover:bg-[#09b230]/10 hover:text-[#09b230] transition-colors"
                        onClick={() => setShowSubsectorModal(true)}
                        title="Criar novo subsetor"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {subsectors.map((subsector) => (
                        <SidebarMenuItem key={subsector.id}>
                          <SidebarMenuButton asChild className="h-9">
                            <NavLink
                              to={`/subsector/${subsector.id}`}
                              className={({ isActive }) =>
                                `flex items-center gap-3 ${
                                  isActive
                                    ? "bg-[#09b230]/20 text-[#09b230] font-medium border-r-2 border-[#09b230]"
                                    : "hover:bg-[#09b230]/10 text-muted-foreground hover:text-[#09b230] transition-all duration-200"
                                }`
                              }
                            >
                              <FolderOpen className="w-4 h-4" />
                              <span className="text-sm">{subsector.name}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                      {subsectors.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          {isManager
                            ? "Clique em + para criar um subsetor"
                            : profile?.role === "collaborator" &&
                              !profile?.subsector_id
                            ? "Você não está atribuído a nenhum subsetor"
                            : "Nenhum subsetor disponível"}
                        </div>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}

        {/* Configurações */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/profile" className={getNavCls}>
                    <Settings className="h-4 w-4" />
                    <span className="ml-2">Configurações</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SubsectorModal
        open={showSubsectorModal}
        onOpenChange={setShowSubsectorModal}
        onSubsectorCreated={handleSubsectorCreated}
      />
    </Sidebar>
  );
}
