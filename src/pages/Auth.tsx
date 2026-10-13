import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, KeyRound, UserRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, PENDING_FULL_NAME_KEY, PENDING_CHURCH_CODE_KEY } from "@/hooks/useAuth";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const openSheet = (startMode: "login" | "signup") => {
    setMode(startMode);
    setOpen(true);
  };

  // "Lembrar de mim" desmarcado: a sessão já fica salva normalmente (é o
  // padrão do app), mas aqui encerramos ela quando a aba/app é fechado, pra
  // não continuar logado da próxima vez que abrir o navegador.
  const signOutOnPageHide = () => { supabase.auth.signOut(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!rememberMe) window.addEventListener("pagehide", signOutOnPageHide);
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
          // No session yet: Supabase requires e-mail confirmation first. We
          // can't call register_with_church_code without being authenticated,
          // so we save the name/code and finish the registration automatically
          // the first time this account logs in after confirming the e-mail.
          localStorage.setItem(PENDING_FULL_NAME_KEY, name);
          localStorage.setItem(PENDING_CHURCH_CODE_KEY, code);
          toast.success("Verifique seu e-mail para confirmar a conta. Depois de confirmar, é só entrar normalmente.");
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) return toast.error("Digite seu e-mail no campo acima primeiro");
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    setForgotBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um link de redefinição para o seu e-mail.");
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Falha ao entrar com Google");
  };

  return (
    <div className="auth-screen">
      <div className="auth-glow" aria-hidden="true" style={{ left: "-18%", top: "6%", width: "70%", height: "70%", animationDelay: "0s" }} />
      <div className="auth-glow" aria-hidden="true" style={{ right: "-22%", bottom: "8%", width: "65%", height: "65%", animationDelay: "-3.5s" }} />
      <div className="auth-streaks" aria-hidden="true" />
      <div className="auth-shard" aria-hidden="true" style={{ left: "-10%", top: "14%", width: "40%", height: "45%" }} />
      <div className="auth-shard" aria-hidden="true" style={{ left: "58%", top: "48%", width: "50%", height: "48%" }} />

      <div className={`auth-brand ${open ? "up" : ""}`}>
        <img src="/origo-logo.png" alt="Origo" className="auth-logo-img" />
      </div>

      <div className={`auth-cta ${open ? "gone" : ""}`}>
        <button type="button" className="auth-btn-light" onClick={() => openSheet("login")}>
          Acessar painel
        </button>
        <div className="text-[13px] text-foreground">
          Ainda não tem conta?{" "}
          <button type="button" className="font-semibold underline" onClick={() => openSheet("signup")}>
            Cadastre-se
          </button>
        </div>
      </div>

      <section className={`auth-sheet ${open ? "open" : ""}`} aria-label={mode === "login" ? "Entrar na conta" : "Criar conta"}>
        <button className="auth-handle" type="button" aria-label="Fechar" onClick={() => setOpen(false)}>
          <span className="block h-[5px] w-11 rounded-full bg-border" />
        </button>

        <h2 className="auth-f auth-f1 m-0 mb-1 mt-1 text-center text-[28px] font-extrabold italic text-primary">
          {mode === "login" ? "olá!" : "vamos começar"}
        </h2>
        <p className="auth-f auth-f1 m-0 mb-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Entre para acessar seu painel" : "Crie sua conta de servo"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex flex-col gap-3.5">
            {mode === "signup" && (
              <>
                <label className="auth-field auth-f auth-f2">
                  <UserRound className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Nome completo"
                    aria-label="Nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label className="auth-field auth-f auth-f2">
                  <KeyRound className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Código da igreja (ex: ORIGO01)"
                    aria-label="Código da igreja"
                    className="uppercase tracking-widest"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                </label>
              </>
            )}

            <label className="auth-field auth-f auth-f3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="shrink-0 text-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <input
                type="email"
                placeholder="E-mail"
                aria-label="E-mail"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="auth-field auth-f auth-f4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="shrink-0 text-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Senha"
                aria-label="Senha"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-eye"
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </label>
          </div>

          {mode === "login" && (
            <div className="auth-f auth-f5 mb-5 mt-4 flex items-center justify-between text-[13px] text-foreground">
              <label className="flex cursor-pointer items-center gap-2">
                <input className="auth-check" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Lembrar de mim
              </label>
              <button type="button" className="font-semibold text-primary disabled:opacity-60" onClick={handleForgotPassword} disabled={forgotBusy}>
                {forgotBusy ? "Enviando..." : "Esqueci a senha"}
              </button>
            </div>
          )}
          {mode === "signup" && <div className="h-5" />}

          <div className="auth-f auth-f6 mt-auto flex flex-col gap-4 pt-2">
            <button type="submit" className="auth-btn-primary flex items-center justify-center" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Entrar" : "Criar conta"}
            </button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">ou</span></div>
            </div>

            <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted" onClick={handleGoogle}>
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8.1z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6-4.5H2.2v2.8C4 20.9 7.7 23 12 23z"/><path fill="#FBBC05" d="M6 14.3a6.5 6.5 0 0 1 0-4.6V6.9H2.2a11 11 0 0 0 0 10.2L6 14.3z"/><path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.7 1 4 3.1 2.2 6.9L6 9.7c.8-2.6 3.2-4.2 6-4.2z"/></svg>
              Continuar com Google
            </button>

            <div className="text-center text-[13px] text-muted-foreground">
              {mode === "login" ? (
                <>Novo por aqui? <button type="button" className="font-semibold text-primary" onClick={() => setMode("signup")}>Criar conta</button></>
              ) : (
                <>Já tem conta? <button type="button" className="font-semibold text-primary" onClick={() => setMode("login")}>Entrar</button></>
              )}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Auth;
