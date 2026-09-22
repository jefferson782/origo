import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Mail, Lock, User as UserIcon, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/origo-logo.png.asset.json";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          const { error: rpcErr } = await supabase.rpc("register_with_church_code", {
            _full_name: name,
            _church_code: code,
          });
          if (rpcErr) throw rpcErr;
          toast.success("Conta criada! Você já pode servir 🙌");
          navigate("/");
        } else {
          toast.success("Verifique seu e-mail para confirmar a conta.");
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Falha ao entrar com Google");
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-soft px-3 py-6 safe-x safe-top safe-bottom sm:p-6">
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="mb-5 text-center animate-fade-in sm:mb-8">
          <img src={logo.url} alt="Origo — Planeje, organize e sirva" className="mx-auto mb-3 h-auto w-[min(70vw,260px)] object-contain sm:mb-4" />
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            O ponto de partida onde cada servo encontra seu lugar para servir.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-elegant animate-slide-up min-[390px]:p-5 sm:p-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid grid-cols-2 w-full mb-5">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TabsContent value="signup" className="space-y-4 mt-0">
                <div className="space-y-1.5">
                  <Label>Nome completo</Label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" value={name} onChange={(e) => setName(e.target.value)} required={mode === "signup"} placeholder="Seu nome" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Código da Igreja</Label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required={mode === "signup"} placeholder="ORIGO01" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Peça o código ao líder da sua igreja.</p>
                </div>
              </TabsContent>

              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@igreja.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                </div>
              </div>

              <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95 h-11">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">ou</span></div>
            </div>

            <Button type="button" variant="outline" className="w-full h-11" onClick={handleGoogle}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8.1z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6-4.5H2.2v2.8C4 20.9 7.7 23 12 23z"/><path fill="#FBBC05" d="M6 14.3a6.5 6.5 0 0 1 0-4.6V6.9H2.2a11 11 0 0 0 0 10.2L6 14.3z"/><path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.7 1 4 3.1 2.2 6.9L6 9.7c.8-2.6 3.2-4.2 6-4.2z"/></svg>
              Continuar com Google
            </Button>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:text-primary">← Voltar</Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;