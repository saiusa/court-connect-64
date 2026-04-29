import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Role = "admin" | "owner" | "user";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setRoles((data || []).map((r: any) => r.role as Role));
        setLoading(false);
      });
  }, [user, authLoading]);

  return {
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isOwner: roles.includes("owner") || roles.includes("admin"),
  };
}
