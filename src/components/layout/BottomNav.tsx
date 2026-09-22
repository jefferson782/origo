import { NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Users, User, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const BottomNav = () => {
  const { canManage } = useAuth();

  const items = [
    { to: "/", label: "Início", icon: LayoutDashboard },
    { to: "/minha-escala", label: "Minha", icon: CalendarDays },
    { to: "/geral", label: "Geral", icon: Users },
    ...(canManage ? [{ to: "/gerenciar", label: "Gerenciar", icon: Settings2 }] : []),
    { to: "/perfil", label: "Perfil", icon: User },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 glass border-t border-border safe-x"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul
        className="mx-auto flex max-w-5xl items-stretch justify-around px-0.5 min-[390px]:px-1"
        style={{ height: "var(--app-nav-h)" }}
      >
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "tap relative mx-auto flex h-full w-full min-w-0 max-w-[92px] flex-col items-center justify-center gap-1 rounded-lg",
                  "touch-target select-none",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-x-1 inset-y-2 -z-0 rounded-lg bg-primary-soft animate-scale-in" />
                  )}
                  <Icon
                    className={cn(
                      "relative z-10 h-[22px] w-[22px] transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                    aria-hidden="true"
                  />
                   <span className="relative z-10 max-w-full truncate px-0.5 text-[10px] font-semibold leading-none min-[390px]:text-[11px]">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;
