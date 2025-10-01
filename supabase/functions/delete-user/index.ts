/* eslint-disable @typescript-eslint/no-explicit-any */
// deno-lint-ignore-file no-explicit-any
// @ts-expect-error: Deno URL imports are valid in Supabase Edge Functions environment
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error: Deno URL imports are valid in Supabase Edge Functions environment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Deno env is available in edge functions runtime
    const denoEnv = (globalThis as any).Deno?.env;
    const supabaseUrl = denoEnv?.get("SUPABASE_URL");
    const serviceRoleKey = denoEnv?.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(jwt);
    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check requester is manager
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("role, sector_id")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.role !== "manager") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const sectorId = requesterProfile.sector_id;

    // Ensure target belongs to same sector (if profile exists)
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id, sector_id")
      .eq("id", userId)
      .maybeSingle();

    if (targetProfile && sectorId && targetProfile.sector_id !== sectorId) {
      return new Response(
        JSON.stringify({ error: "Cross-sector deletion blocked" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Nullify activities assigned to user to preserve history
    await supabase
      .from("activities")
      .update({ user_id: null })
      .eq("user_id", userId);

    // Delete profile and pending_users entries
    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.from("pending_users").delete().eq("user_id", userId);

    // Finally remove auth user
    const { error: adminErr } = await supabase.auth.admin.deleteUser(userId);
    if (adminErr) throw adminErr;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
