import type { PropsWithChildren } from "react";
import {
  BrainCircuit,
  Database,
  FolderKanban,
  MessageSquareMore,
  Settings2,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/auth.store";
import { Avatar } from "@/shared/ui/Avatar";
import { cn } from "@/shared/utils/cn";

const navItems = [
  { to: "/app/ai", label: "AI", icon: BrainCircuit },
  { to: "/app/rooms", label: "Rooms", icon: MessageSquareMore },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/memory", label: "Memory", icon: Database },
  { to: "/app/settings", label: "Settings", icon: Settings2 },
];

export const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen px-3 pb-24 pt-3 sm:px-4 lg:px-5 lg:pb-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1720px] gap-3 lg:grid-cols-[88px_minmax(0,1fr)]">
        <aside className="panel-shell hidden flex-col items-center justify-between px-3 py-5 lg:flex">
          <div className="space-y-6">
            <div className="rounded-3xl bg-gradient-to-br from-accent to-coral-500 p-3 text-ink-950 shadow-glow">
              <BrainCircuit className="h-7 w-7" />
            </div>
            <nav className="flex flex-col gap-3" aria-label="Primary">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "focus-ring group flex flex-col items-center gap-2 rounded-3xl px-3 py-3 text-xs font-medium text-text-soft transition hover:bg-surface-3 hover:text-text-base",
                        (isActive || location.pathname.startsWith(item.to + "/")) &&
                          "bg-surface-3 text-text-base"
                      )
                    }
                    aria-label={item.label}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
          <Avatar
            src={user?.avatar}
            fallback={user?.displayName ?? user?.username ?? "CS"}
            size="lg"
            online={user?.onlineStatus}
          />
        </aside>
        <main className="flex min-h-[calc(100vh-1.5rem)] flex-col">{children}</main>
      </div>
      <nav
        className="panel-shell fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-1 p-2 lg:hidden"
        aria-label="Mobile primary"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "focus-ring flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] text-text-soft transition",
                active && "bg-surface-3 text-text-base"
              )}
              aria-label={item.label}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
