// Script para verificar o estado do banco de dados
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carrega variáveis de ambiente do arquivo .env.local
dotenv.config({ path: "./.env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log("🔍 Verificando estado do banco de dados...\n");

  try {
    // 1. Verificar setores
    console.log("1. Verificando setores...");
    const { data: sectors, error: sectorsError } = await supabase
      .from("sectors")
      .select("*");

    if (sectorsError) {
      console.error("❌ Erro ao buscar setores:", sectorsError.message);
    } else {
      console.log(`✅ Setores encontrados: ${sectors?.length || 0}`);
      sectors?.forEach((sector) => {
        console.log(`   - ${sector.name} (ID: ${sector.id})`);
      });
    }

    // 2. Verificar subsetores
    console.log("\n2. Verificando subsetores...");
    const { data: subsectors, error: subsectorsError } = await supabase
      .from("subsectors")
      .select("*");

    if (subsectorsError) {
      console.error("❌ Erro ao buscar subsetores:", subsectorsError.message);
    } else {
      console.log(`✅ Subsetores encontrados: ${subsectors?.length || 0}`);
      subsectors?.forEach((subsector) => {
        console.log(
          `   - ${subsector.name} (ID: ${subsector.id}, Setor: ${subsector.sector_id})`
        );
      });
    }

    // 3. Verificar perfis
    console.log("\n3. Verificando perfis...");
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error("❌ Erro ao buscar perfis:", profilesError.message);
    } else {
      console.log(`✅ Perfis encontrados: ${profiles?.length || 0}`);
      profiles?.forEach((profile) => {
        console.log(
          `   - ${profile.full_name || profile.email} (Role: ${
            profile.role
          }, Setor: ${profile.sector_id || "N/A"}, Aprovado: ${
            profile.is_approved !== false ? "Sim" : "Não"
          })`
        );
      });
    }

    // 4. Verificar atividades
    console.log("\n4. Verificando atividades...");
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("*")
      .limit(5);

    if (activitiesError) {
      console.error("❌ Erro ao buscar atividades:", activitiesError.message);
    } else {
      console.log(
        `✅ Atividades encontradas: ${
          activities?.length || 0
        } (mostrando primeiras 5)`
      );
      activities?.forEach((activity) => {
        console.log(
          `   - ${activity.title} (Status: ${activity.status}, Setor: ${activity.sector_id})`
        );
      });
    }

    // 5. Verificar problemas comuns
    console.log("\n5. Verificando problemas comuns...");

    // Perfis sem setor
    const profilesWithoutSector = profiles?.filter((p) => !p.sector_id) || [];
    if (profilesWithoutSector.length > 0) {
      console.log(
        `⚠️  ${profilesWithoutSector.length} perfis sem setor definido:`
      );
      profilesWithoutSector.forEach((p) => {
        console.log(`   - ${p.full_name || p.email}`);
      });
    }

    // Perfis não aprovados
    const unapprovedProfiles =
      profiles?.filter((p) => p.is_approved === false) || [];
    if (unapprovedProfiles.length > 0) {
      console.log(`⚠️  ${unapprovedProfiles.length} perfis não aprovados:`);
      unapprovedProfiles.forEach((p) => {
        console.log(`   - ${p.full_name || p.email}`);
      });
    }

    console.log("\n✅ Verificação concluída!");
  } catch (error) {
    console.error("❌ Erro geral:", error.message);
  }
}

checkDatabase();
