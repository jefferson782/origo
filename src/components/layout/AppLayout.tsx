import { ReactNode } from "react";
import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  /** Remove o padding horizontal do container (para seções full-bleed) */
  bleed?: boolean;
}

const AppLayout = ({ children, bleed = false }: AppLayoutProps) => {
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-background safe-x">
      <AppHeader />
      <main
        className={[
          "mx-auto w-full max-w-5xl animate-fade-in",
          bleed ? "px-0" : "px-3 min-[390px]:px-4 sm:px-6",
        ].join(" ")}
        style={{
          paddingTop: "calc(var(--app-header-h) + var(--safe-top) + 1rem)",
          paddingBottom: "calc(var(--app-nav-h) + var(--safe-bottom) + 1.5rem)",
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
