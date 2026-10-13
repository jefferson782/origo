import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sparkles, Plus, Calendar as CalendarIcon, Users, Building2, Trash2,
  UserPlus, Wand2, Hand, CalendarRange, Repeat, Shield, UserCog, Music, Megaphone, Send,
  HandHeart, Baby, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

function deptVisual(name: string, idx: number) {
  const n = name.toLowerCase();
  const Icon = n.includes("lou")
    ? Music
    : n.includes("míd") || n.includes("mid") || n.includes("comunic")
    ? Video
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

interface Department { id: string; name: string; }
interface Service { id: string; name: string; service_date: string; service_time: string | null; }
interface Profile { id: string; full_name: string | null; }
interface Assignment {
  id: string; service_id: string; department_id: string; user_id: string; role: string | null;
}
interface Recurring { id: string; name: string; weekday: number; service_time: string | null; }
interface DeptMember { id: string; department_id: string; user_id: string; }
interface RoleRow { id: string; user_id: string; role: string; church_id: string | null; department_id: string | null; }
interface Song { id: string; service_id: string; title: string; artist: string | null; song_key: string | null; link: string | null; position: number; }

const Gerenciar = () => {
  const { user, canManage } = useAuth();
  const [churchId, setChurchId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [deptMembers, setDeptMembers] = useState<DeptMember[]>([]);
  const [roleRows, setRoleRows] = useState<RoleRow[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const [deptName, setDeptName] = useState("");
  const [svcName, setSvcName] = useState("");
  const [svcDate, setSvcDate] = useState("");
  const [svcTime, setSvcTime] = useState("");

  const [recName, setRecName] = useState("");
  const [recWeekdays, setRecWeekdays] = useState<number[]>([]);
  const [recTime, setRecTime] = useState("");

  const [selService, setSelService] = useState<string>("");
  const [selDept, setSelDept] = useState<string>("");
  const [selUser, setSelUser] = useState<string>("");
  const [selRole, setSelRole] = useState<string>("");

  const [genMonth, setGenMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [calDate, setCalDate] = useState<Date | undefined>(new Date());

  const [memberDept, setMemberDept] = useState<string>("");
  const [memberUser, setMemberUser] = useState<string>("");
  const [leaderDept, setLeaderDept] = useState<string>("");
  const [leaderUser, setLeaderUser] = useState<string>("");

  const [songService, setSongService] = useState<string>("");
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songKey, setSongKey] = useState("");
  const [songLink, setSongLink] = useState("");

  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeDept, setNoticeDept] = useState<string>("all");
  const [sendingNotice, setSendingNotice] = useState(false);

  const sendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim()) return toast.error("Coloque um título");
    setSendingNotice(true);
    let targets: string[] = [];
    if (noticeDept === "all") {
      targets = profiles.map((p) => p.id);
    } else {
      targets = deptMembers.filter((m) => m.department_id === noticeDept).map((m) => m.user_id);
    }
    if (targets.length === 0) { setSendingNotice(false); return toast.error("Nenhum destinatário"); }
    const rows = targets.map((uid) => ({ user_id: uid, title: noticeTitle, body: noticeBody || null }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSendingNotice(false);
    if (error) return toast.error(error.message);
    toast.success(`Aviso enviado para ${targets.length} pessoa${targets.length>1?"s":""}`);
    setNoticeTitle(""); setNoticeBody("");
  };

  const loadAll = async (cid: string) => {
    const [d, s, p, a, r, dm, rr, sg] = await Promise.all([
      supabase.from("departments").select("*").eq("church_id", cid).order("name"),
      supabase.from("services").select("*").eq("church_id", cid).order("service_date"),
      supabase.from("profiles").select("id, full_name").eq("church_id", cid),
      supabase.from("assignments").select("*"),
      supabase.from("recurring_services" as any).select("*").eq("church_id", cid).order("weekday"),
      supabase.from("department_members" as any).select("*"),
      supabase.from("user_roles").select("id, user_id, role, church_id, department_id").eq("church_id", cid),
      supabase.from("service_songs" as any).select("*").order("position"),
    ]);
    setDepartments(d.data ?? []);
    setServices(s.data ?? []);
    setProfiles(p.data ?? []);
    setAssignments(a.data ?? []);
    setRecurring(((r as any).data ?? []) as Recurring[]);
    setDeptMembers(((dm as any).data ?? []) as DeptMember[]);
    setRoleRows((rr.data ?? []) as RoleRow[]);
    setSongs(((sg as any).data ?? []) as Song[]);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("church_id").eq("id", user.id).single();
      if (data?.church_id) {
        setChurchId(data.church_id);
        await loadAll(data.church_id);
      }
      setLoading(false);
    })();
  }, [user]);

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach(p => m.set(p.id, p.full_name ?? "Sem nome"));
    return m;
  }, [profiles]);

  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach(d => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const usersTakenInService = useMemo(() => {
    const m = new Map<string, Set<string>>();
    assignments.forEach(a => {
      if (!m.has(a.service_id)) m.set(a.service_id, new Set());
      m.get(a.service_id)!.add(a.user_id);
    });
    return m;
  }, [assignments]);

  const availableUsersForSelService = useMemo(() => {
    if (!selService) return profiles;
    const taken = usersTakenInService.get(selService) ?? new Set();
    return profiles.filter(p => !taken.has(p.id));
  }, [selService, profiles, usersTakenInService]);

  const serviceDays = useMemo(() => {
    return services.map(s => {
      const [y, m, d] = s.service_date.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
  }, [services]);

  const servicesOnSelectedDate = useMemo(() => {
    if (!calDate) return [];
    const iso = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, "0")}-${String(calDate.getDate()).padStart(2, "0")}`;
    return services.filter(s => s.service_date === iso);
  }, [services, calDate]);

  if (!canManage) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Acesso restrito a líderes e administradores.</p>
        </div>
      </AppLayout>
    );
  }

  const addDept = async () => {
    if (!deptName.trim() || !churchId) return;
    const { error } = await supabase.from("departments").insert({ church_id: churchId, name: deptName.trim() });
    if (error) return toast.error(error.message);
    setDeptName(""); toast.success("Departamento criado");
    loadAll(churchId);
  };

  const removeDept = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll(churchId!);
  };

  const addService = async () => {
    if (!svcName || !svcDate || !churchId) return;
    const { error } = await supabase.from("services").insert({
      church_id: churchId, name: svcName, service_date: svcDate, service_time: svcTime || null,
    });
    if (error) return toast.error(error.message);
    setSvcName(""); setSvcDate(""); setSvcTime("");
    toast.success("Culto criado");
    loadAll(churchId);
  };

  const removeService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll(churchId!);
  };

  const addRecurring = async () => {
    if (!recName || !churchId) return;
    if (recWeekdays.length === 0) return toast.error("Selecione pelo menos um dia da semana");
    const rows = recWeekdays.map((weekday) => ({
      church_id: churchId, name: recName, weekday, service_time: recTime || null,
    }));
    const { error } = await (supabase.from("recurring_services" as any) as any).insert(rows);
    if (error) return toast.error(error.message);
    setRecName(""); setRecTime(""); setRecWeekdays([]);
    toast.success(`Culto fixo criado em ${rows.length} dia${rows.length > 1 ? "s" : ""}`);
    loadAll(churchId);
  };

  const removeRecurring = async (id: string) => {
    const { error } = await (supabase.from("recurring_services" as any) as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll(churchId!);
  };

  const materializeMonth = async () => {
    if (!churchId || !genMonth) return;
    const [y, m] = genMonth.split("-").map(Number);
    const { data, error } = await supabase.rpc("materialize_recurring_for_month" as any, {
      _church_id: churchId, _year: y, _month: m,
    });
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} cultos criados a partir dos fixos`);
    loadAll(churchId);
  };

  const addAssignment = async () => {
    if (!selService || !selDept || !selUser) return toast.error("Preencha culto, departamento e voluntário");
    const taken = usersTakenInService.get(selService);
    if (taken?.has(selUser)) return toast.error("Pessoa já escalada nesse culto em outro departamento");
    const { error } = await supabase.from("assignments").insert({
      service_id: selService, department_id: selDept, user_id: selUser, role: selRole || null,
    });
    if (error) return toast.error(error.message);
    setSelUser(""); setSelRole("");
    toast.success("Escalação adicionada");
    loadAll(churchId!);
  };

  const removeAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll(churchId!);
  };

  const addMemberToDept = async () => {
    if (!memberDept || !memberUser) return toast.error("Selecione departamento e pessoa");
    const { error } = await (supabase.from("department_members" as any) as any).insert({
      department_id: memberDept, user_id: memberUser,
    });
    if (error) return toast.error(error.message);
    setMemberUser("");
    toast.success("Membro adicionado ao departamento");
    loadAll(churchId!);
  };

  const removeMemberFromDept = async (id: string) => {
    const { error } = await (supabase.from("department_members" as any) as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll(churchId!);
  };

  const promoteLeader = async () => {
    if (!leaderDept || !leaderUser || !churchId) return toast.error("Selecione departamento e pessoa");
    const { error } = await supabase.from("user_roles").insert({
      user_id: leaderUser, role: "leader", church_id: churchId, department_id: leaderDept,
    } as any);
    if (error) return toast.error(error.message);
    setLeaderUser("");
    toast.success("Líder promovido");
    loadAll(churchId);
  };

  const demoteLeader = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll(churchId!);
  };

  const addSong = async () => {
    if (!songService || !songTitle.trim()) return toast.error("Selecione o culto e informe o título");
    const pos = songs.filter(s => s.service_id === songService).length;
    const { error } = await (supabase.from("service_songs" as any) as any).insert({
      service_id: songService,
      title: songTitle.trim(),
      artist: songArtist.trim() || null,
      song_key: songKey.trim() || null,
      link: songLink.trim() || null,
      position: pos,
    });
    if (error) return toast.error(error.message);
    setSongTitle(""); setSongArtist(""); setSongKey(""); setSongLink("");
    toast.success("Música adicionada");
    loadAll(churchId!);
  };

  const removeSong = async (id: string) => {
    const { error } = await (supabase.from("service_songs" as any) as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll(churchId!);
  };

  const generateAuto = async () => {
    if (!churchId || !genMonth) return;
    const [y, m] = genMonth.split("-").map(Number);
    const { data, error } = await supabase.rpc("generate_monthly_schedule", {
      _church_id: churchId, _year: y, _month: m,
    });
    if (error) return toast.error(error.message);
    toast.success(`${data} escalações geradas`);
    loadAll(churchId);
  };

  const clearMonth = async () => {
    if (!churchId || !genMonth) return;
    if (!confirm("Apagar todas as escalações do mês selecionado?")) return;
    const [y, m] = genMonth.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const endDate = new Date(y, m, 0);
    const end = `${y}-${String(m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    const monthServices = services.filter(s => s.service_date >= start && s.service_date <= end).map(s => s.id);
    if (monthServices.length === 0) return toast.info("Sem cultos no mês");
    const { error } = await supabase.from("assignments").delete().in("service_id", monthServices);
    if (error) return toast.error(error.message);
    toast.success("Escalações do mês apagadas");
    loadAll(churchId);
  };

  if (loading) {
    return <AppLayout><div className="py-20 text-center text-muted-foreground">Carregando…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <section className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Escalas</h1>
            <p className="text-sm text-muted-foreground">Líderes e núcleo organizam aqui</p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="manual" className="animate-fade-in">
        <TabsList className="flex w-full justify-start gap-2 overflow-x-auto bg-transparent p-0 mb-5 h-auto scrollbar-none">
          <TabsTrigger value="manual" className="gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground data-[state=active]:shadow-none shrink-0">
            <Hand className="w-4 h-4" /> Manual
          </TabsTrigger>
          <TabsTrigger value="fixos" className="gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground data-[state=active]:shadow-none shrink-0">
            <Repeat className="w-4 h-4" /> Fixos
          </TabsTrigger>
          <TabsTrigger value="pessoas" className="gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground data-[state=active]:shadow-none shrink-0">
            <UserCog className="w-4 h-4" /> Pessoas
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground data-[state=active]:shadow-none shrink-0">
            <Wand2 className="w-4 h-4" /> Automática
          </TabsTrigger>
          <TabsTrigger value="cal" className="gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground data-[state=active]:shadow-none shrink-0">
            <CalendarRange className="w-4 h-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="avisos" className="gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground data-[state=active]:shadow-none shrink-0">
            <Megaphone className="w-4 h-4" /> Avisos
          </TabsTrigger>
        </TabsList>

        {/* MANUAL */}
        <TabsContent value="manual" className="space-y-6">
          <Card className="p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Departamentos</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {departments.length} equipe{departments.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {departments.map((d, idx) => {
                const { Icon, text, bg } = deptVisual(d.name, idx);
                const count = deptMembers.filter((m) => m.department_id === d.id).length;
                return (
                  <div key={d.id} className="relative shrink-0 w-[150px] rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
                    <button
                      onClick={() => removeDept(d.id)}
                      aria-label={`Excluir ${d.name}`}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className={`w-11 h-11 rounded-xl ${bg} ${text} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{d.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{count} servo{count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                );
              })}
              <div className="shrink-0 w-[150px] rounded-2xl border border-dashed border-border p-4 flex flex-col justify-between gap-3">
                <Input
                  placeholder="Nome"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDept()}
                  className="h-9 text-sm"
                />
                <Button onClick={addDept} size="sm" variant="secondary" className="w-full">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Criar
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Cultos / Eventos</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
              <Input placeholder="Nome (Culto da Noite)" value={svcName} onChange={(e) => setSvcName(e.target.value)} className="sm:col-span-2" />
              <Input type="date" value={svcDate} onChange={(e) => setSvcDate(e.target.value)} />
              <Input type="time" value={svcTime} onChange={(e) => setSvcTime(e.target.value)} />
            </div>
            <Button onClick={addService} className="mb-4 w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Adicionar culto</Button>
            <div className="space-y-3">
              {services.map(s => {
                const todayIso = new Date().toISOString().slice(0, 10);
                const d = new Date(s.service_date + "T00:00");
                const scaled = assignments.filter((a) => a.service_id === s.id).length;
                return (
                  <div key={s.id} className="flex gap-3">
                    <div className="w-11 shrink-0 text-center pt-2.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                      </p>
                      <p className="text-xl font-extrabold leading-none tabular-nums">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{s.name}</p>
                          {s.service_date === todayIso && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-soft text-primary shrink-0">Hoje</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.service_time?.slice(0, 5) ?? "Sem horário"} · {scaled === 0 ? "Ninguém escalado ainda" : `${scaled} pessoa${scaled !== 1 ? "s" : ""} escalada${scaled !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <button onClick={() => removeService(s.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {services.length === 0 && <p className="text-xs text-muted-foreground">Nenhum culto cadastrado</p>}
            </div>
          </Card>

          <Card className="p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Escalar voluntário</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Quem já estiver em outro departamento neste mesmo culto não aparece na lista.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs">Culto</Label>
                <Select value={selService} onValueChange={setSelService}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {new Date(s.service_date + "T00:00").toLocaleDateString("pt-BR")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Departamento</Label>
                <Select value={selDept} onValueChange={setSelDept}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  Voluntário {selService && `(${availableUsersForSelService.length} disponíveis)`}
                </Label>
                <Select value={selUser} onValueChange={setSelUser}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {availableUsersForSelService.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name ?? "Sem nome"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Função (opcional)</Label>
                <Input placeholder="Ex: Guitarra solo" value={selRole} onChange={(e) => setSelRole(e.target.value)} />
              </div>
            </div>
            <Button onClick={addAssignment} className="bg-gradient-primary w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Escalar
            </Button>
          </Card>

          <Card className="p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Escalações atuais</h2>
            </div>
            <div className="space-y-4">
              {services.map(s => {
                const list = assignments.filter(a => a.service_id === s.id);
                if (list.length === 0) return null;
                return (
                  <div key={s.id} className="border rounded-xl p-3">
                    <p className="font-semibold mb-2">
                      {s.name} <span className="text-xs text-muted-foreground">— {new Date(s.service_date + "T00:00").toLocaleDateString("pt-BR")}</span>
                    </p>
                    <div className="space-y-1.5">
                      {list.map(a => (
                        <div key={a.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                          <div>
                            <span className="font-medium">{profileMap.get(a.user_id) ?? "—"}</span>
                            <span className="text-muted-foreground"> · {deptMap.get(a.department_id)}</span>
                            {a.role && <span className="text-muted-foreground"> · {a.role}</span>}
                          </div>
                          <button onClick={() => removeAssignment(a.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {assignments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma escalação ainda</p>
              )}
            </div>
          </Card>

          <Card className="p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Repertório do Louvor</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              As músicas adicionadas aqui aparecem na aba <strong>Geral</strong> para todos os voluntários.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Culto</Label>
                <Select value={songService} onValueChange={setSongService}>
                  <SelectTrigger><SelectValue placeholder="Selecione o culto" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {new Date(s.service_date + "T00:00").toLocaleDateString("pt-BR")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input placeholder="Ex: Lugar Secreto" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Artista (opcional)</Label>
                <Input placeholder="Ex: Gabriela Rocha" value={songArtist} onChange={(e) => setSongArtist(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Tom (opcional)</Label>
                <Input placeholder="Ex: G" value={songKey} onChange={(e) => setSongKey(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Link (opcional)</Label>
                <Input placeholder="YouTube, Cifra Club..." value={songLink} onChange={(e) => setSongLink(e.target.value)} />
              </div>
            </div>
            <Button onClick={addSong} className="bg-gradient-primary w-full sm:w-auto mb-4">
              <Plus className="w-4 h-4 mr-2" /> Adicionar música
            </Button>

            <div className="space-y-4">
              {services.map(s => {
                const list = songs.filter(x => x.service_id === s.id);
                if (list.length === 0) return null;
                return (
                  <div key={s.id} className="border rounded-xl p-3">
                    <p className="font-semibold mb-2">
                      {s.name} <span className="text-xs text-muted-foreground">— {new Date(s.service_date + "T00:00").toLocaleDateString("pt-BR")}</span>
                    </p>
                    <div className="space-y-1.5">
                      {list.map(song => (
                        <div key={song.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {song.title}
                              {song.song_key && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary-soft text-primary">{song.song_key}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {song.artist}
                              {song.link && (
                                <> · <a href={song.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">link</a></>
                              )}
                            </p>
                          </div>
                          <button onClick={() => removeSong(song.id)} className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {songs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma música cadastrada</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* AUTO */}
        <TabsContent value="auto">
          <Card className="p-6 bg-gradient-soft border-primary-soft animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Escala automática do mês</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Distribui voluntários nos cultos do mês escolhido, equilibrando a carga
              e impedindo a mesma pessoa em dois departamentos no mesmo culto.
            </p>

            <div className="space-y-2 mb-5">
              <Label className="text-xs">Mês</Label>
              <Input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} className="max-w-[220px]" />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl bg-card border p-3 text-center">
                <p className="text-2xl font-bold text-primary">{services.length}</p>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Cultos</p>
              </div>
              <div className="rounded-xl bg-card border p-3 text-center">
                <p className="text-2xl font-bold text-primary">{departments.length}</p>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Deptos</p>
              </div>
              <div className="rounded-xl bg-card border p-3 text-center">
                <p className="text-2xl font-bold text-primary">{profiles.length}</p>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Voluntários</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={generateAuto} className="bg-gradient-primary flex-1">
                <Wand2 className="w-4 h-4 mr-2" /> Gerar escala
              </Button>
              <Button onClick={materializeMonth} variant="secondary" className="flex-1">
                <Repeat className="w-4 h-4 mr-2" /> Criar cultos fixos do mês
              </Button>
              <Button onClick={clearMonth} variant="outline" className="flex-1">
                <Trash2 className="w-4 h-4 mr-2" /> Limpar mês
              </Button>
            </div>

            {(services.length === 0 || departments.length === 0 || profiles.length === 0) && (
              <p className="text-xs text-warning mt-4">
                Cadastre cultos, departamentos e tenha voluntários na igreja antes de gerar.
              </p>
            )}
          </Card>
        </TabsContent>

        {/* FIXOS */}
        <TabsContent value="fixos">
          <Card className="p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Cultos fixos da semana</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Defina os cultos que se repetem toda semana — pode marcar mais de um dia (ex: terça e quinta) de uma vez.
              Eventos pontuais devem ser criados na aba Manual.
              Use “Criar cultos fixos do mês” na aba Automática (ou ao gerar a escala) para materializá-los.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <Input placeholder="Nome (Culto da Noite)" value={recName} onChange={(e) => setRecName(e.target.value)} />
              <Input type="time" value={recTime} onChange={(e) => setRecTime(e.target.value)} />
            </div>
            <div className="mb-3">
              <Label className="text-xs mb-1.5 block">Dias da semana</Label>
              <div className="flex flex-wrap gap-1.5">
                {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((n, i) => {
                  const active = recWeekdays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRecWeekdays((prev) => active ? prev.filter((d) => d !== i) : [...prev, i].sort())}
                      className={cn(
                        "h-9 min-w-[44px] px-2 rounded-lg text-xs font-semibold border transition-colors",
                        active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
                      )}
                      aria-pressed={active}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button onClick={addRecurring} className="mb-4 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Adicionar fixo
            </Button>
            <div className="space-y-2">
              {recurring.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Toda {["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][r.weekday]}
                      {r.service_time ? ` · ${r.service_time.slice(0,5)}` : ""}
                    </p>
                  </div>
                  <button onClick={() => removeRecurring(r.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {recurring.length === 0 && <p className="text-xs text-muted-foreground">Nenhum culto fixo cadastrado</p>}
            </div>
          </Card>
        </TabsContent>

        {/* PESSOAS */}
        <TabsContent value="pessoas" className="space-y-6">
          <Card className="p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Membros do departamento</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Adicione voluntários aos departamentos. Só quem está num departamento entra na escala automática dele.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <Select value={memberDept} onValueChange={setMemberDept}>
                <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={memberUser} onValueChange={setMemberUser}>
                <SelectTrigger><SelectValue placeholder="Pessoa" /></SelectTrigger>
                <SelectContent>
                  {profiles
                    .filter(p => !memberDept || !deptMembers.some(dm => dm.department_id === memberDept && dm.user_id === p.id))
                    .map(p => <SelectItem key={p.id} value={p.id}>{p.full_name ?? "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={addMemberToDept}><Plus className="w-4 h-4 mr-2" /> Adicionar</Button>
            </div>
            <div className="space-y-3 mt-4">
              {departments.map(d => {
                const members = deptMembers.filter(dm => dm.department_id === d.id);
                return (
                  <div key={d.id} className="border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{d.name}</p>
                      <Badge variant="secondary">{members.length}</Badge>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem membros</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {members.map(dm => (
                          <Badge key={dm.id} variant="outline" className="text-xs gap-1.5 pr-1">
                            {profileMap.get(dm.user_id) ?? "—"}
                            <button onClick={() => removeMemberFromDept(dm.id)} className="hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Líderes de departamento</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Líderes só conseguem gerenciar o próprio departamento (membros e escalas).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <Select value={leaderDept} onValueChange={setLeaderDept}>
                <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={leaderUser} onValueChange={setLeaderUser}>
                <SelectTrigger><SelectValue placeholder="Pessoa" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name ?? "Sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={promoteLeader}><Shield className="w-4 h-4 mr-2" /> Promover</Button>
            </div>
            <div className="space-y-2">
              {roleRows.filter(r => r.role === "leader" && r.department_id).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div className="text-sm">
                    <span className="font-semibold">{profileMap.get(r.user_id) ?? "—"}</span>
                    <span className="text-muted-foreground"> · {deptMap.get(r.department_id!) ?? "—"}</span>
                  </div>
                  <button onClick={() => demoteLeader(r.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {roleRows.filter(r => r.role === "leader" && r.department_id).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum líder de departamento ainda</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* CALENDAR */}
        <TabsContent value="cal">
          <Card className="p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <CalendarRange className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Calendário de escalas</h2>
            </div>

            <div className="flex justify-center mb-4">
              <Calendar
                mode="single"
                selected={calDate}
                onSelect={setCalDate}
                modifiers={{ hasService: serviceDays }}
                modifiersClassNames={{
                  hasService: "bg-primary-soft text-primary font-bold",
                }}
                className={cn("p-3 pointer-events-auto rounded-xl border")}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">
                {calDate?.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>

              {servicesOnSelectedDate.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum culto neste dia.</p>
              )}

              {servicesOnSelectedDate.map(s => {
                const list = assignments.filter(a => a.service_id === s.id);
                const byDept = new Map<string, Assignment[]>();
                list.forEach(a => {
                  if (!byDept.has(a.department_id)) byDept.set(a.department_id, []);
                  byDept.get(a.department_id)!.push(a);
                });
                return (
                  <div key={s.id} className="border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{s.name}</p>
                      {s.service_time && (
                        <Badge variant="secondary">{s.service_time.slice(0, 5)}</Badge>
                      )}
                    </div>
                    {list.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem escalação ainda</p>
                    )}
                    <div className="space-y-2">
                      {Array.from(byDept.entries()).map(([deptId, items]) => (
                        <div key={deptId}>
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-1">
                            {deptMap.get(deptId)}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map(a => (
                              <Badge key={a.id} variant="outline" className="text-xs">
                                {profileMap.get(a.user_id) ?? "—"}
                                {a.role ? ` · ${a.role}` : ""}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* AVISOS */}
        <TabsContent value="avisos" className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Enviar aviso</h2>
            </div>
            <p className="text-xs text-muted-foreground">Manda um aviso pra todo mundo da igreja ou só pra um departamento. Aparece no sininho 🔔 de cada pessoa.</p>
            <form onSubmit={sendNotice} className="space-y-3">
              <div>
                <Label>Para</Label>
                <Select value={noticeDept} onValueChange={setNoticeDept}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda a igreja</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} placeholder="Ex: Reunião de líderes domingo" required />
              </div>
              <div>
                <Label>Mensagem (opcional)</Label>
                <textarea
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Detalhes do aviso..."
                />
              </div>
              <Button type="submit" disabled={sendingNotice} className="w-full bg-gradient-primary text-primary-foreground">
                <Send className="w-4 h-4 mr-2" /> {sendingNotice ? "Enviando..." : "Enviar aviso"}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Gerenciar;
