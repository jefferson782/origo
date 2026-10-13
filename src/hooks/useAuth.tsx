import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "super_admin" | "admin" | "leader" | "member";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: Role[];
  isSuperAdmin: boolean;
  canManage: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

// When Supabase requires e-mail confirmation, signUp() returns no session,
// so we can't call register_with_church_code yet (it needs an authenticated
// user). We stash the name/code here and finish the registration the first
// time the confirmed user actually gets a session (see completePendingChurchRegistration).
export const PENDING_FULL_NAME_KEY = "origo_pending_full_name";
export const PENDING_CHURCH_CODE_KEY = "origo_pending_church_code";

async function completePendingChurchRegistration(userId: string) {
  const pendingCode = localStorage.getItem(PENDING_CHURCH_CODE_KEY);
  if (!pendingCode) return;
  const pendingName = localStorage.getItem(PENDING_FULL_NAME_KEY) ?? "";
  const { data: profile } = await supabase.from("profiles").select("church_id").eq("id", userId).maybeSingle();
  if (profile?.church_id) {
    localStorage.removeItem(PENDING_CHURCH_CODE_KEY);
    localStorage.removeItem(PENDING_FULL_NAME_KEY);
    return;
  }
  const { error } = await supabase.rpc("register_with_church_code", {
    _full_name: pendingName,
    _church_code: pendingCode,
  });
  localStorage.removeItem(PENDING_CHURCH_CODE_KEY);
  localStorage.removeItem(PENDING_FULL_NAME_KEY);
  if (error) {
    toast.error("Não foi possível vincular sua conta à igreja: " + error.message);
  } else {
    toast.success("Conta confirmada e vinculada à igreja! Você já pode servir 🙌");
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(async () => {
          await completePendingChurchRegistration(s.user.id);
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
          setRoles((data ?? []).map((r: any) => r.role));
        }, 0);
      } else {
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        (async () => {
          await completePendingChurchRegistration(s.user.id);
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
          setRoles((data ?? []).map((r: any) => r.role));
        })();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{
      user, session, loading, roles,
      isSuperAdmin: roles.includes("super_admin"),
      canManage: roles.some(r => r === "super_admin" || r === "admin" || r === "leader"),
      signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);