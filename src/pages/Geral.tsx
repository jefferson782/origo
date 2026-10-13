import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Search,
  Music,
  Megaphone,
  HandHeart,
  Baby,
  Users,
  CheckCircle2,
  CircleDashed,
  Play,
  Clock,
  CalendarRange,
} from "lucide-react";

interface ServiceRow {
  id: string;
  name: string;
  service_date: string;
  service_time: string | null;
}

interface AssignmentRow {
  id: string;
  user_id: string;
  department_id: string;
  status: string;
}

interface SongRow {
  id: string;
  title: string;
  artist: string | null;
  song_key: string | null;
  link: string | null;
}

function deptStyle(name: string, idx: number) {
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
    { text: "text-primary", border: "border-l-primary" },
    { text: "text-info", border: "border-l-info" },
    { text: "text-warning", border: "border-l-warning" },
    { text: "text-rose", border: "border-l-rose" },
    { text: "text-success", border: "border-l-success" },
  ];
  const { text, border } = palette[idx % palette.length];
  return { Icon, text, border };
}

const Geral = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [nextService, setNextService] = useState<ServiceRow | null>(null);
  const [upcomingServices, setUpcomingServices] = useState<ServiceRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("church_id").eq("id", user.id).single();
      if (!prof?.church_id) {
        setLoading(false);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const { data: services } = await supabase
        .from("services")
        .select("id, name, service_date, service_time")
        .eq("church_id", prof.church_id)
        .gte("service_date", today)
        .order("service_date")
        .limit(3);

      const svc = services?.[0] ?? null;
      setNextService(svc);
      setUpcomingServices(services?.slice(1) ?? []);

      const { data: depts } = await supabase
        .from("departments")
        .select("id, name")
        .eq("church_id", prof.church_id)
        .order("name");
      setDepartments(depts ?? []);

      if (svc) {
        const [songsRes, assignRes] = await Promise.all([
          (supabase.from("service_songs" as any) as any)
            .select("id, title, artist, song_key, link, position")
            .eq("service_id", svc.id)
            .order("position"),
          supabase.from("assignments").select("id, user_id, department_id, status").eq("service_id", svc.id),
        ]);
        setSongs((songsRes.data ?? []) as SongRow[]);
        const rows = (assignRes.data ?? []) as AssignmentRow[];
        setAssignments(rows);

        const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
        if (userIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
          const map = new Map<string, string>();
          (profs ?? []).forEach((p) => map.set(p.id, p.full_name ?? "Sem nome"));
          setProfileNames(map);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const daysUntil = nextService
    ? Math.max(0, Math.ceil((new Date(nextService.service_date + "T00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000))
    : null;
  const weekdayLabel = (d: string) => new Date(d + "T00:00").toLocaleDateString("pt-BR", { weekday: "long" });
  const dayLabel = (d: string) => new Date(d + "T00:00").getDate().toString().padStart(2, "0");

  const departmentsWithPeople = useMemo(() => {
    return departments
      .map((d, idx) => ({
        ...d,
        idx,
        members: assignments
          .filter((a) => a.department_id === d.id)
          .map((a) => ({ name: profileNames.get(a.user_id) ?? "—", confirmed: a.status === "confirmed" })),
      }))
      .filter((d) => d.members.length > 0);
  }, [departments, assignments, profileNames]);

  const chips = useMemo(() => ["Todos", ...departmentsWithPeople.map((d) => d.name)], [departmentsWithPeople]);

  const visibleDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return departmentsWithPeople.filter((d) => {
      if (activeChip !== "Todos" && d.name !== activeChip) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.members.some((m) => m.name.toLowerCase().includes(q));
    });
  }, [departmentsWithPeople, activeChip, search]);

  const allServing = useMemo(() => departmentsWithPeople.flatMap((d) => d.members), [departmentsWithPeople]);

  return (
    <AppLayout>
      <section className="mb-6 space-y-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Escala Geral
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão completa de todos os ministérios do próximo culto.
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-11 h-12 bg-primary-soft border-none rounded-xl"
            placeholder="Buscar por ministério ou pessoa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {chips.length > 1 && (
        <div className="sticky top-[64px] z-20 -mx-4 px-4 py-2 mb-4 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => setActiveChip(c)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeChip === c
                    ? "bg-primary text-primary-foreground shadow-elegant"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {loading ? (
          <div className="md:col-span-12">
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : !nextService ? (
          <div className="md:col-span-12">
            <EmptyState icon={CalendarRange} title="Nenhum culto agendado" description="Quando um culto for cadastrado, ele aparece aqui." />
          </div>
        ) : (
          <div
            className="md:col-span-12 relative overflow-hidden rounded-3xl p-6 md:p-8 text-primary-foreground shadow-elegant"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-bold uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  {daysUntil === 0 ? "Hoje" : daysUntil === 1 ? "Amanhã" : `Faltam ${daysUntil ?? "-"} dias`}
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight">{nextService.name}</h2>
                <p className="text-sm text-primary-foreground/85 capitalize">
                  {weekdayLabel(nextService.service_date)}, {dayLabel(nextService.service_date)} de{" "}
                  {new Date(nextService.service_date + "T00:00").toLocaleDateString("pt-BR", { month: "long" })}
                  {nextService.service_time && ` • ${nextService.service_time.slice(0, 5)}`}
                </p>
              </div>
              {allServing.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {allServing.slice(0, 3).map((p, idx) => (
                      <div
                        key={p.name + idx}
                        className="w-11 h-11 rounded-full border-2 border-white/40 bg-white/20 backdrop-blur text-white text-xs font-bold flex items-center justify-center"
                        style={{ zIndex: 10 - idx }}
                        title={p.name}
                      >
                        {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                      </div>
                    ))}
                  </div>
                  {allServing.length > 3 && (
                    <div className="w-11 h-11 rounded-full border-2 border-white/40 bg-white/10 backdrop-blur flex items-center justify-center text-[11px] font-bold text-white">
                      +{allServing.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && nextService && (
          <div className="md:col-span-7 bg-card rounded-2xl shadow-card border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Repertório</span>
              </div>
            </div>
            {songs.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">
                Nenhuma música definida para o próximo culto.
              </p>
            ) : (
              <ol className="divide-y divide-border">
                {songs.map((s, i) => (
                  <li key={s.id} className="p-4 flex items-center gap-3 group hover:bg-primary-soft/40 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[11px] font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {s.title}
                        {s.song_key && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-bold tracking-wider">
                            {s.song_key}
                          </span>
                        )}
                      </p>
                      {s.artist && <p className="text-[11px] text-muted-foreground truncate">{s.artist}</p>}
                    </div>
                    {s.link && (
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                        aria-label="Abrir link da música"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {!loading && nextService && visibleDepartments.length === 0 && (
          <div className="md:col-span-5">
            <EmptyState
              icon={Users}
              title="Ninguém escalado ainda"
              description="Quando alguém for escalado para este culto, o ministério aparece aqui."
            />
          </div>
        )}

        {!loading &&
          visibleDepartments.map((d) => {
            const { Icon, text, border } = deptStyle(d.name, d.idx);
            return (
              <div key={d.id} className="md:col-span-5 bg-card rounded-2xl shadow-card border border-border overflow-hidden">
                <div className={`border-l-4 ${border}`}>
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${text}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${text}`}>{d.name}</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-lg font-semibold">
                      {d.members.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {d.members.map((p, idx) => (
                      <div key={p.name + idx} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center font-bold text-xs shadow-sm">
                            {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold text-foreground">{p.name}</p>
                        </div>
                        {p.confirmed ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <CircleDashed className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

        {upcomingServices.length > 0 && (
          <>
            <div className="md:col-span-12 py-6 flex items-center gap-4">
              <div className="h-px flex-grow bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                Próximas Datas
              </span>
              <div className="h-px flex-grow bg-border" />
            </div>

            {upcomingServices.map((s) => (
              <div
                key={s.id}
                className="md:col-span-6 bg-card rounded-2xl p-4 shadow-card border border-border flex items-center gap-4"
              >
                <div className="relative w-14 h-16 rounded-xl overflow-hidden border border-border shrink-0 bg-card">
                  <div className="absolute top-0 inset-x-0 h-4 bg-gradient-primary flex items-center justify-center">
                    <span className="text-[9px] font-bold text-primary-foreground tracking-wider">
                      {new Date(s.service_date + "T00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 top-4 flex items-center justify-center">
                    <span className="font-display text-2xl font-bold text-foreground leading-none">
                      {dayLabel(s.service_date)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {weekdayLabel(s.service_date)}
                    {s.service_time && ` • ${s.service_time.slice(0, 5)}`}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Geral;
