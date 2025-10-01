/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuthFinal";

export interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  status?: string;
  sector_id?: string | null;
  subsector_id?: string | null;
  sectors?: {
    name: string;
  };
  subsectors?: {
    name: string;
  };
}

export const usePendingUsers = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchPendingUsers = useCallback(async () => {
    if (!user || profile?.role !== "manager" || !profile?.is_approved) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("🔍 Fetching pending users from pending_users table...");

      // Direct query to pending_users table
      const { data, error } = await (supabase as any)
        .from("pending_users")
        .select(
          `
          id,
          email,
          full_name,
          created_at,
          status,
          sector_id,
          subsector_id,
          sectors:sector_id ( name ),
          subsectors:subsector_id ( name )
        `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      console.log("📋 Pending users query result:", { data, error });

      if (error) {
        console.error("❌ Error fetching pending users:", error);
        setError(error.message);
        return;
      }

      // Type assertion for the result
      const typedData = (data ?? []) as unknown as PendingUser[];
      console.log("✅ Typed pending users:", typedData);
      setPendingUsers(typedData || []);
    } catch (err) {
      console.error("Error fetching pending users:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar usuários pendentes"
      );
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const approveUser = async (userId: string) => {
    try {
      console.log("🔄 Approving user:", userId);

      // First, get the pending user data
      const { data: pendingUser, error: fetchError } = await (supabase as any)
        .from("pending_users")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError || !pendingUser) {
        console.error("❌ Error fetching pending user:", fetchError);
        throw new Error("Usuário pendente não encontrado");
      }

      console.log("📋 Pending user data:", pendingUser);

      // Create the profile in the profiles table
      const { error: profileError } = await supabase.from("profiles").insert({
        id: pendingUser.id, // This should be the same as auth.users.id
        email: pendingUser.email,
        full_name: pendingUser.full_name || "",
        role: "collaborator",
        sector_id: pendingUser.sector_id,
        subsector_id: pendingUser.subsector_id,
        is_approved: true,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("❌ Error creating profile:", profileError);
        throw profileError;
      }

      console.log("✅ Profile created successfully");

      // Update the pending user status to approved
      const { error: updateError } = await (supabase as any)
        .from("pending_users")
        .update({ status: "approved" })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Error updating pending user status:", updateError);
        // If profile was created but status update failed, we should probably keep the profile
        console.warn("⚠️ Profile was created but pending status update failed");
      }

      console.log("✅ User approved successfully with profile created");
      // Remove from pending list
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      return true;
    } catch (err) {
      console.error("Error approving user:", err);
      setError(err instanceof Error ? err.message : "Erro ao aprovar usuário");
      return false;
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      console.log("🔄 Rejecting user:", userId);

      // For now, let's update the status directly in pending_users table
      const { error } = await (supabase as any)
        .from("pending_users")
        .update({ status: "rejected" })
        .eq("id", userId);

      if (error) {
        console.error("❌ Error rejecting user:", error);
        throw error;
      }

      console.log("✅ User rejected successfully");
      // Remove from pending list
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      return true;
    } catch (err) {
      console.error("Error rejecting user:", err);
      setError(err instanceof Error ? err.message : "Erro ao rejeitar usuário");
      return false;
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  return {
    pendingUsers,
    loading,
    error,
    approveUser,
    rejectUser,
    refetch: fetchPendingUsers,
  };
};
