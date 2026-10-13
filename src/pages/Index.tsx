import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Music,
  Megaphone,
  HandHeart,
  Baby,
  Users,
  Bell,
  CalendarCheck,
  Check,
  X,
  Ban,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NextAssignment {
  id: string;
  status: string;
  services: { name: string; service_date: string; service_time: string | null } | null;
  departments: { name: string } | null;
}

interface DeptSummary {
  id: string;
  name: string;
  count: number;
}

interface Notif {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
}

function deptVisual(name: string, idx: number) {
  const n = name.toLowerCase();
  const Icon = n.includes("lou")
    ? Music
    : n.includes("míd") || n.includes("mid") || n.includes("comunic")
    ? Megaphone
    : n.includes("diacon") || n.includes("recep") || n.includes("acolh")
    ? HandHeart
    : n.includes("infant") || n.includes("kids") || n.includes("crian")
    ? Baby
    : Users;
  const palette = [
    { text: "text-primary", bg: "bg-primary-soft" },
    { text: "text-success", bg: "bg-success/10" },
    { text: "text-warning", bg: "bg-warning/10" },
    { text: "text-rose", bg: "bg-rose/10" },
    { text: "text-info", bg: "bg-info/10" },
  ];
  const { text, bg } = palette[idx % palette.length];
  return { Icon, text, bg };
}

const Index = () => {
  const { user } = useAuth();
  const displayName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name
    || user?.email?.split("@")[0]
    || "Servo";
  const firstName = displayName.split(" ")[0];

  const [loading, setLoading] = useState(true);
  const [nextAssignment, setNextAssignment] = useState<NextAssignment | null>(null);
  const [departments, setDepartments] = useState<DeptSummary[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unavailableUpcoming, setUnavailableUpcoming] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("church_id").eq("id", user.id).maybeSingle();
    const churchId = prof?.church_id;
    const today = new Date().toISOString().slice(0, 10);

    const [assignRes, notifRes, unavRes] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, status, service_id, services(name, service_date, service_time), departments(name)")
        .eq("user_id", user.id),
      supabase.from("notifications").select("id, title, body, link").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2),
      supabase.from("unavailability").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("day", today),
    ]);

    const upcoming = ((assignRes.data ?? []) as unknown as NextAssignment[])
      .filter((a) => a.services && a.services.service_date >= today)
      .sort((a, b) => (a.services!.service_date < b.services!.service_date ? -1 : 1));
    setNextAssignment(upcoming[0] ?? null);
    setNotifs(notifRes.data ?? []);
    setUnavailableUpcoming(unavRes.count ?? 0);

    if (churchId) {
      const { data: depts } = await supabase.from("departments").select("id, name").eq("church_id", churchId).order("name");
      const deptIds = (depts ?? []).map((d) => d.id);
      const { data: members } = deptIds.length
        ? await supabase.from("department_members" as any).select("department_id").in("department_id", deptIds)
        : { data: [] as { department_id: string }[] };
      const counts = new Map<string, number>();
      (members ?? []).forEach((m: any) => counts.set(m.department_id, (counts.get(m.department_id) ?? 0) + 1));
      setDepartments((depts ?? []).map((d) => ({ id: d.id, name: d.name, count: counts.get(d.id) ?? 0 })));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setAssignmentStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    const { error } = await supabase.from("assignments").update({ status }).eq("id", id);
    setUpdatingStatus(false);
    if (error) return toast.error(error.message);
    toast.success(status === "confirmed" ? "Presença confirmada!" : "Escala recusada");
    load();
  };

  const assignmentDate = useMemo(() => {
    if (!nextAssignment?.services) return null;
    return new Date(nextAssignment.services.service_date + "T00:00:00");
  }, [nextAssignment]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <section>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1">
            Bem-vindo de volta
          </p>
          <h1 className="text-3xl font-bold text-foreground">Olá, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? "Carregando sua escala..."
              : nextAssignment
              ? "Você tem um compromisso em breve."
              : "Você não tem nenhuma escala futura no momento."}
          </p>
        </section>

        <section>
          {loading ? (
            <Skeleton className="h-44 rounded-2xl" />
          ) : nextAssignment && nextAssignment.services ? (
            (() => {
              const deptName = nextAssignment.departments?.name ?? "Ministério";
              const { Icon: DeptIcon } = deptVisual(deptName, 0);
              const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
              const statusMeta =
                nextAssignment.status === "confirmed"
                  ? { dot: "var(--success)", label: "Confirmado" }
                  : nextAssignment.status === "declined"
                  ? { dot: "var(--muted-foreground)", label: "Você marcou indisponível" }
                  : { dot: "var(--warning)", label: "Aguardando sua resposta" };
              return (
                <div className="commit-wrap">
                  <div className="commit-band">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-primary-foreground">
                      <DeptIcon className="commit-band-icon w-[18px] h-[18px]" aria-hidden="true" />
                      {deptName}
                    </div>
                  </div>
                  <div className="commit-panel">
                    <div className="commit-status-row">
                      <span className="flex items-center gap-2">
                        <span className="commit-dot" style={{ ["--commit-dot" as any]: statusMeta.dot }} aria-hidden="true" />
                        {statusMeta.label}
                      </span>
                      {assignmentDate && (
                        <span className="capitalize">{format(assignmentDate, "EEE, d MMM", { locale: ptBR })}{nextAssignment.services.service_time && ` · ${nextAssignment.services.service_time.slice(0, 5)}`}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 my-5">
                      <div
                        className="commit-avatar flex h-14 w-14 items-center justify-center rounded-full border-[3px] text-lg font-extrabold"
                        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--secondary))", color: "hsl(var(--primary))" }}
                      >
                        {initials || "?"}
                      </div>
                      <div>
                        <p className="text-xl font-extrabold tracking-tight text-foreground">{nextAssignment.services.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">Você está escalado</p>
                      </div>
                    </div>

                    {nextAssignment.status === "pending" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => setAssignmentStatus(nextAssignment.id, "confirmed")}
                          className="commit-btn commit-btn-primary"
                        >
                          <Check className="w-4 h-4" /> Confirmar
                        </button>
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => setAssignmentStatus(nextAssignment.id, "declined")}
                          className="commit-btn"
                        >
                          <Ban className="w-4 h-4" /> Indisponível
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled
                          className={`commit-btn ${nextAssignment.status === "confirmed" ? "commit-btn-done-ok" : "commit-btn-done-no"}`}
                        >
                          {nextAssignment.status === "confirmed" ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          {nextAssignment.status === "confirmed" ? "Confirmado" : "Indisponível"}
                        </button>
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => setAssignmentStatus(nextAssignment.id, "pending")}
                          className="commit-btn"
                        >
                          Alterar resposta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <EmptyState
              icon={CalendarCheck}
              title="Sem escalas futuras"
              description="Quando você for escalado em algum culto, ele aparece aqui."
            />
          )}
        </section>

        {departments.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ministérios da sua igreja
              </h3>
              <Link to="/geral" className="text-xs text-primary font-semibold">
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {departments.map(({ id, name, count }, idx) => {
                const { Icon, text, bg } = deptVisual(name, idx);
                return (
                  <Link
                    key={id}
                    to="/geral"
                    className="relative flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border shadow-card active:scale-95 transition-transform"
                  >
                    <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${bg} ${text}`}>
                      {count}
                    </span>
                    <div className={`w-14 h-14 rounded-2xl ${bg} ${text} flex items-center justify-center`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground text-center">{name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {count} servo{count !== 1 ? "s" : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avisos
            </h3>
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          {notifs.length === 0 ? (
            <p className="text-xs text-muted-foreground bg-card rounded-xl border border-border p-4 text-center">
              Nenhum aviso por aqui ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {notifs.map((n) => (
                <Link
                  key={n.id}
                  to={n.link ?? "#"}
                  className="bg-card p-4 rounded-xl border border-border flex gap-4 items-center shadow-card"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <Link
          to="/minha-escala"
          className="block bg-gradient-soft rounded-2xl p-5 border border-primary-soft"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-primary-soft flex items-center justify-center text-primary shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Dias indisponíveis</p>
              <p className="text-xs text-muted-foreground">
                {unavailableUpcoming === 0
                  ? "Nenhum dia marcado — toque para adicionar"
                  : `${unavailableUpcoming} dia${unavailableUpcoming > 1 ? "s" : ""} marcado${unavailableUpcoming > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </AppLayout>
  );
};

export default Index;
