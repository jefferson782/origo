import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Check, X, Plus, Trash2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Assignment {
  id: string;
  status: string;
  service_id: string;
  department_id: string;
  services: { name: string; service_date: string; service_time: string | null } | null;
  departments: { name: string } | null;
}

interface Unav { id: string; day: string; reason: string | null }

const MinhaEscala = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [unav, setUnav] = useState<Unav[]>([]);
  const [day, setDay] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: a } = await supabase
      .from("assignments")
      .select("id, status, service_id, department_id, services(name, service_date, service_time), departments(name)")
      .eq("user_id", user.id)
      .order("service_id");
    setAssignments((a ?? []) as any);
    const { data: u } = await supabase
      .from("unavailability").select("*").eq("user_id", user.id).order("day");
    setUnav((u ?? []) as any);
  };
  useEffect(() => { load(); }, [user]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("assignments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "confirmed" ? "Escala confirmada!" : "Escala recusada");
    load();
  };

  const addUnav = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !day) return;
    const { error } = await supabase.from("unavailability").insert({ user_id: user.id, day, reason });
    if (error) return toast.error(error.message);
    setDay(""); setReason(""); load();
  };

  const removeUnav = async (id: string) => {
    await supabase.from("unavailability").delete().eq("id", id);
    load();
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = assignments.filter(a => a.services && a.services.service_date >= todayIso);

  const statusBadge = (s: string) => {
    if (s === "confirmed") return <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold">Confirmado</span>;
    if (s === "declined") return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">Recusado</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-semibold">Pendente</span>;
  };

  return (
    <AppLayout>
      <section className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Minha Escala</h1>
        <p className="text-sm text-muted-foreground">Confirme suas escalas e marque dias indisponíveis</p>
      </section>

      <div className="space-y-4">
        {upcoming.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            Você não tem escalas futuras.
          </div>
        )}
        {upcoming.map((a) => {
          const d = a.services ? new Date(a.services.service_date + "T00:00:00") : null;
          return (
             <article key={a.id} className="rounded-lg border border-border bg-card p-4 shadow-card content-auto">
               <div className="mb-3 flex items-start justify-between gap-3">
                 <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-1">{a.departments?.name}</p>
                  <h3 className="text-lg font-bold text-foreground">{a.services?.name}</h3>
                  {statusBadge(a.status)}
                </div>
                {d && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary leading-none">{format(d, "dd")}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">{format(d, "MMM", { locale: ptBR })}</p>
                  </div>
                )}
              </div>
              {a.services?.service_time && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Clock className="w-4 h-4" /> {a.services.service_time.slice(0,5)}
                </div>
              )}
              {a.status !== "confirmed" && a.status !== "declined" && (
                 <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                  <Button onClick={() => setStatus(a.id, "confirmed")} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
                    <Check className="w-4 h-4 mr-1.5" /> Confirmar
                  </Button>
                  <Button onClick={() => setStatus(a.id, "declined")} variant="outline" className="flex-1">
                    <X className="w-4 h-4 mr-1.5" /> Recusar
                  </Button>
                </div>
              )}
              {(a.status === "confirmed" || a.status === "declined") && (
                <Button onClick={() => setStatus(a.id, "pending")} variant="ghost" size="sm">Alterar resposta</Button>
              )}
            </article>
          );
        })}

         <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Ban className="w-4 h-4 text-primary" /> Dias indisponíveis
          </h2>
          <p className="text-xs text-muted-foreground mb-3">A escala automática não vai te incluir nesses dias.</p>
           <form onSubmit={addUnav} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} required className="flex-1" />
            <Input placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1" />
             <Button type="submit" className="bg-gradient-primary text-primary-foreground sm:w-11" aria-label="Adicionar indisponibilidade"><Plus className="w-4 h-4" /><span className="sm:sr-only">Adicionar</span></Button>
          </form>
          <div className="space-y-2">
            {unav.length === 0 && <p className="text-sm text-muted-foreground">Nenhum dia marcado.</p>}
            {unav.map((u) => (
               <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 p-2.5">
                 <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{format(new Date(u.day + "T00:00:00"), "dd/MM/yyyy")}</span>
                  {u.reason && <span className="text-xs text-muted-foreground">— {u.reason}</span>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeUnav(u.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MinhaEscala;
