export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activities: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          created_by: string;
          description: string | null;
          due_date: string | null;
          estimated_time: number | null;
          id: string;
          is_private: boolean;
          list_id: string | null;
          priority: Database["public"]["Enums"]["activity_priority"];
          sector_id: string;
          status: Database["public"]["Enums"]["activity_status"];
          subsector_id: string | null;
          title: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          created_by: string;
          description?: string | null;
          due_date?: string | null;
          estimated_time?: number | null;
          id?: string;
          is_private?: boolean;
          list_id?: string | null;
          priority?: Database["public"]["Enums"]["activity_priority"];
          sector_id: string;
          status?: Database["public"]["Enums"]["activity_status"];
          subsector_id?: string | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string;
          description?: string | null;
          due_date?: string | null;
          estimated_time?: number | null;
          id?: string;
          is_private?: boolean;
          list_id?: string | null;
          priority?: Database["public"]["Enums"]["activity_priority"];
          sector_id?: string;
          status?: Database["public"]["Enums"]["activity_status"];
          subsector_id?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_subsector_id_fkey";
            columns: ["subsector_id"];
            isOneToOne: false;
            referencedRelation: "subsectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_user_id_fkey1";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "personal_lists";
            referencedColumns: ["id"];
          }
        ];
      };
      personal_lists: {
        Row: {
          id: string;
          user_id: string;
          sector_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sector_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sector_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "personal_lists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_lists_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          }
        ];
      };
      activity_assignments: {
        Row: {
          activity_id: string;
          assigned_at: string | null;
          assigned_by: string;
          assigned_to: string;
          id: string;
        };
        Insert: {
          activity_id: string;
          assigned_at?: string | null;
          assigned_by: string;
          assigned_to: string;
          id?: string;
        };
        Update: {
          activity_id?: string;
          assigned_at?: string | null;
          assigned_by?: string;
          assigned_to?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_assignments_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          }
        ];
      };
      invitations: {
        Row: {
          created_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          role: Database["public"]["Enums"]["user_role"];
          sector_id: string;
          subsector_id: string | null;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          role?: Database["public"]["Enums"]["user_role"];
          sector_id: string;
          subsector_id?: string | null;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          role?: Database["public"]["Enums"]["user_role"];
          sector_id?: string;
          subsector_id?: string | null;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_subsector_id_fkey";
            columns: ["subsector_id"];
            isOneToOne: false;
            referencedRelation: "subsectors";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          message: string;
          read: boolean;
          related_activity_id: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          message: string;
          read?: boolean;
          related_activity_id?: string | null;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          message?: string;
          read?: boolean;
          related_activity_id?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_related_activity_id_fkey";
            columns: ["related_activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          }
        ];
      };
      pending_users: {
        Row: {
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          sector_id: string | null;
          status: string | null;
          subsector_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          sector_id?: string | null;
          status?: string | null;
          subsector_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          sector_id?: string | null;
          status?: string | null;
          subsector_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pending_users_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pending_users_subsector_id_fkey";
            columns: ["subsector_id"];
            isOneToOne: false;
            referencedRelation: "subsectors";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string;
          id: string;
          is_approved: boolean | null;
          role: Database["public"]["Enums"]["user_role"];
          sector_id: string | null;
          subsector_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name: string;
          id: string;
          is_approved?: boolean | null;
          role?: Database["public"]["Enums"]["user_role"];
          sector_id?: string | null;
          subsector_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          is_approved?: boolean | null;
          role?: Database["public"]["Enums"]["user_role"];
          sector_id?: string | null;
          subsector_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_subsector_id_fkey";
            columns: ["subsector_id"];
            isOneToOne: false;
            referencedRelation: "subsectors";
            referencedColumns: ["id"];
          }
        ];
      };
      sectors: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      subsectors: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          sector_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          sector_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          sector_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subsectors_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          }
        ];
      };
      subtasks: {
        Row: {
          activity_id: string;
          created_at: string;
          description: string | null;
          id: string;
          is_completed: boolean | null;
          order_index: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_completed?: boolean | null;
          order_index?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_completed?: boolean | null;
          order_index?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subtasks_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_user: {
        Args: { approver_id: string; user_id: string };
        Returns: undefined;
      };
      delete_activity: {
        Args: { activity_id: string };
        Returns: boolean;
      };
      delete_invitation: {
        Args: { invitation_id: string };
        Returns: Json;
      };
      get_all_profiles_for_manager: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          sector_id: string;
          sectors: Json;
        }[];
      };
      get_user_role: {
        Args: { user_id: string };
        Returns: Database["public"]["Enums"]["user_role"];
      };
      get_user_sector: {
        Args: { user_id: string };
        Returns: string;
      };
      is_manager: {
        Args: { user_id: string };
        Returns: boolean;
      };
      is_user_manager: {
        Args: { user_id: string };
        Returns: boolean;
      };
      reject_user: {
        Args: { rejector_id: string; user_id: string };
        Returns: undefined;
      };
      send_invitation_email: {
        Args: {
          email_to: string;
          invite_link: string;
          inviter_name: string;
          subsector_name: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      activity_priority: "low" | "medium" | "high";
      activity_status: "pending" | "in_progress" | "completed" | "archived";
      user_role: "manager" | "collaborator";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_priority: ["low", "medium", "high"],
      activity_status: ["pending", "in_progress", "completed", "archived"],
      user_role: ["manager", "collaborator"],
    },
  },
} as const;
