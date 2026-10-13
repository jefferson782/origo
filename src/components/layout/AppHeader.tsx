import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface Notif {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const AppHeader = () => {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifs((data ?? []) as Notif[]);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("notif-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  const unread = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  const initial = useMemo(() => {
    const name =
      (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
      user?.email ||
      "S";
    return name.charAt(0).toUpperCase();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    load();
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 glass border-b border-border safe-x"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div
        className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 sm:px-6"
        style={{ height: "var(--app-header-h)" }}
      >
        <Link to="/" className="tap flex min-w-0 items-center" aria-label="Origo — início">
          <img
            src="/origo-logo.png"
            alt="Origo"
            className="h-[clamp(2.25rem,7vw,2.75rem)] w-auto max-w-[min(55vw,220px)] object-contain object-left [filter:brightness(0)_invert(1)]"
          />
        </Link>

        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <button
                aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"}
                className="tap relative flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground hover:bg-primary-soft"
              >
                <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden p-0"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Notificações</p>
                {unread > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={markAllRead}>
                    <CheckCheck className="h-4 w-4" /> Marcar lidas
                  </Button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                {notifs.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      icon={Bell}
                      title="Tudo em dia"
                      description="Você será avisado aqui quando for escalado ou receber um aviso."
                    />
                  </div>
                ) : (
                  notifs.map((n) => (
                    <Link
                      key={n.id}
                      to={n.link ?? "#"}
                      className={`block border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/60 active:bg-muted ${
                        !n.read ? "bg-primary-soft/40" : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Link to="/perfil" aria-label="Meu perfil" className="tap">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-card">
              {initial}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
