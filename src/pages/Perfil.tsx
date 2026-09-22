import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CalendarRange, PlusCircle, Lock, LogOut, Pencil, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

const Perfil = () => {
  const { user, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = (user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "Servo";
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-5 animate-fade-in sm:space-y-6">
        <section className="flex flex-col items-center rounded-lg border border-border bg-card p-5 text-center shadow-card animate-scale-in sm:p-6">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-3xl font-bold shadow-elegant">
              {initial}
            </div>
            <button aria-label="Editar foto" className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant transition-transform active:scale-90">
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="mt-1 max-w-full break-all text-xs text-muted-foreground">{user?.email}</p>
        </section>

        {isSuperAdmin && (
          <Link to="/super-admin" className="block bg-gradient-primary text-primary-foreground p-4 rounded-2xl shadow-elegant hover:opacity-95 transition-opacity animate-slide-up">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-card p-4 rounded-2xl border border-border shadow-card border-l-4 border-l-primary">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Próximo Bloqueio</p>
              <p className="text-lg font-bold text-foreground">15 Out — 20 Out</p>
              <p className="text-sm text-muted-foreground mt-1">Viagem de Trabalho</p>
            </div>
            <button className="bg-primary-soft text-primary p-4 rounded-2xl border border-primary-soft flex flex-col items-center justify-center gap-2 hover:bg-secondary transition-colors">
              <PlusCircle className="w-7 h-7" />
              <span className="text-xs font-semibold">Adicionar Indisponibilidade</span>
            </button>
          </div>
        </section>

        <section className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/40">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferências de Notificação</h3>
          </div>
          <div className="divide-y divide-border">
            {[
              { title: "Novas Escalas", desc: "Avisar quando eu for escalado", on: true },
              { title: "Lembretes de Culto", desc: "24h antes do meu serviço", on: true },
              { title: "Trocas de Escala", desc: "Solicitações de outros voluntários", on: false },
            ].map((p) => (
              <div key={p.title} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <Switch defaultChecked={p.on} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 pt-2">
          <button className="w-full flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-card hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Alterar Senha</span>
            </div>
          </button>
          <Button
            variant="outline"
            onClick={async () => { await signOut(); navigate("/auth"); }}
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
