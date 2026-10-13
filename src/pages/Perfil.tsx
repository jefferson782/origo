import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CalendarRange, Lock, LogOut, Shield, Ban } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Unav {
  id: string;
  day: string;
  reason: string | null;
}

const Perfil = () => {
  const { user, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email?.split("@")[0] || "Servo";
  const initial = displayName.charAt(0).toUpperCase();

  const [nextUnav, setNextUnav] = useState<Unav | null>(null);
  const [unavCount, setUnavCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, count } = await supabase
        .from("unavailability")
        .select("id, day, reason", { count: "exact" })
        .eq("user_id", user.id)
        .gte("day", today)
        .order("day")
        .limit(1);
      setNextUnav(data?.[0] ?? null);
      setUnavCount(count ?? 0);
    })();
  }, [user]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
        <section className="flex flex-col items-center rounded-lg border border-border bg-card p-5 text-center shadow-card sm:p-6">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-primary text-3xl font-bold text-primary-foreground shadow-elegant">
            {initial}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="mt-1 max-w-full break-all text-xs text-muted-foreground">{user?.email}</p>
        </section>

        {isSuperAdmin && (
          <Link to="/super-admin" className="block bg-gradient-primary text-primary-foreground p-4 rounded-2xl shadow-elegant hover:opacity-95 transition-opacity">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" />
              <div className="min-w-0 pr-3">
                <p className="font-semibold">Painel Super Admin</p>
                <p className="text-xs opacity-90">Gerencie igrejas e códigos</p>
              </div>
            </div>
          </Link>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-primary" />
            Minha Disponibilidade
          </h2>
          <Link
            to="/minha-escala"
            className="block bg-card p-4 rounded-2xl border border-border shadow-card border-l-4 border-l-primary hover:bg-muted/40 transition-colors"
          >
            {nextUnav ? (
              <>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Próximo Bloqueio</p>
                <p className="text-lg font-bold text-foreground">
                  {format(new Date(nextUnav.day + "T00:00:00"), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{nextUnav.reason || "Sem motivo informado"}</p>
                {unavCount > 1 && (
                  <p className="text-xs text-primary mt-2">+{unavCount - 1} outro(s) dia(s) marcado(s)</p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Ban className="h-7 w-7 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Nenhum dia indisponível marcado</p>
                  <p className="text-xs text-muted-foreground">Toque para adicionar um bloqueio</p>
                </div>
              </div>
            )}
          </Link>
        </section>

        <section className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/40">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferências de Notificação</h3>
          </div>
          <div className="divide-y divide-border">
            {[
              { title: "Novas Escalas", desc: "Avisar quando eu for escalado" },
              { title: "Lembretes de Culto", desc: "24h antes do meu serviço" },
              { title: "Trocas de Escala", desc: "Solicitações de outros voluntários" },
            ].map((p) => (
              <div key={p.title} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Em breve
                  </span>
                  <Switch disabled />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 pt-2">
          <button className="w-full flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-card opacity-60" disabled>
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Alterar Senha</span>
            </div>
            <span className="text-[10px] font-semibold uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Em breve
            </span>
          </button>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            className="w-full bg-destructive-soft text-destructive border-destructive/20 hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
          <p className="text-center text-muted-foreground text-[11px] py-2">Origo • v1.0</p>
        </section>
      </div>
    </AppLayout>
  );
};

export default Perfil;
