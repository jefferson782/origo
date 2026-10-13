import { Link, useLocation } from "react-router-dom";
import { Home, CalendarDays, Users, User, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const BottomNav = () => {
  const { canManage } = useAuth();
  const { pathname } = useLocation();

  const items = [
    { to: "/", label: "Início", icon: Home, end: true },
    { to: "/minha-escala", label: "Minha", icon: CalendarDays, end: false },
    { to: "/geral", label: "Geral", icon: Users, end: false },
    ...(canManage ? [{ to: "/gerenciar", label: "Gerenciar", icon: Settings2, end: false }] : []),
    { to: "/perfil", label: "Perfil", icon: User, end: false },
  ];

  const activeIndex = Math.max(
    0,
    items.findIndex((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
  );
  const activeLabel = items[activeIndex]?.label ?? "Início";

  return (
    <nav aria-label="Navegação principal" className="bnav-wrap safe-x">
      <div className="bnav-shell">
        <div className="bnav-bar">
          <span
            className="bnav-indicator"
            style={{ width: `calc((100% - 12px) / ${items.length})`, transform: `translateX(${activeIndex * 100}%)` }}
            aria-hidden="true"
          />
          <div className="bnav-tabs" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map(({ to, label, icon: Icon, end }, idx) => {
              const isActive = idx === activeIndex;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn("bnav-tab touch-target select-none", isActive && "on")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="bnav-icon h-[21px] w-[21px]" aria-hidden="true" />
                  <span className="max-w-full truncate px-0.5">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="bnav-band">Você está em: {activeLabel}</div>
      </div>
    </nav>
  );
};

export default BottomNav;
