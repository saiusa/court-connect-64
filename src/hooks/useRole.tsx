import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type Role = "admin" | "owner" | "user";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setIsFetching(false);
      return;
    }
    
    // Read roles directly from app_metadata instead of fetching from DB
    // This avoids the 'permission denied for function has_role' RLS issue
    const userRoles = user.app_metadata?.roles || [];
    setRoles(userRoles);
    setIsFetching(false);
  }, [user, authLoading]);

  return {
    roles,
    loading: authLoading || isFetching,
    isAdmin: roles.includes("admin"),
    isOwner: roles.includes("owner") && !roles.includes("admin"),
  };
}
