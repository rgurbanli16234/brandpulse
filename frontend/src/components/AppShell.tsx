import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BellRing,
  FlaskConical,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings as SettingsIcon,
  Search,
  User
} from "lucide-react";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mentions", label: "Mentions", icon: MessageSquareText },
  { to: "/threads", label: "Incident Threads", icon: Layers },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/playground", label: "Analyze Playground", icon: FlaskConical },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 group">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-110">
        <Activity className="h-4 w-4" />
      </span>
      <span className="leading-none">
        <span className="block text-sm font-bold tracking-tight text-sidebar-foreground">BrandPulse</span>
        <span className="block text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-bold mt-0.5">
          Sentiment Monitor
        </span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, ready, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !session) navigate({ to: "/login" });
  }, [ready, session, navigate]);

  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => api.summary(),
    enabled: Boolean(session),
    refetchInterval: 60_000,
  });

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  const unread = summary.data?.unacknowledged_alerts ?? 0;

  return (
    <div className="flex min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-6 py-8">
          <Logo />
        </div>
        
        <nav className="flex-1 space-y-1 px-3">
          <div className="text-[10px] font-bold text-sidebar-foreground/30 px-3 py-2 uppercase tracking-[0.2em]">Navigation</div>
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all group",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60")} />
                <span className="truncate">{item.label}</span>
                {item.to === "/alerts" && unread > 0 ? (
                  <span className="text-numeric ml-auto rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-sidebar-border/50 px-6 py-6">
          <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent/30 p-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
              {session.business.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-sidebar-foreground">{session.business.name}</p>
              <p className="truncate text-[10px] text-sidebar-foreground/40 font-semibold uppercase tracking-wider mt-0.5">{session.business.plan} Plan</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
          <div className="md:hidden">
            <Logo />
          </div>

          <div className="hidden flex-1 max-w-md relative md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
            <div className="w-full bg-secondary-tint rounded-xl h-9 pl-10 flex items-center text-xs text-foreground/40 border border-transparent hover:border-border transition-colors cursor-text">
              Search mentions, incidents, authors...
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl bg-secondary-tint text-foreground/60 hover:text-primary relative" asChild>
              <Link to="/alerts">
                <BellRing className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary border-2 border-background" />
                )}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 transition-all hover:bg-secondary-tint active:scale-95">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] font-bold text-foreground leading-none">{session.user.email.split('@')[0]}</p>
                    <p className="text-[9px] text-foreground/40 font-semibold leading-none mt-1">Admin</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-border shadow-xl">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="text-xs font-bold">{session.user.email}</p>
                  <p className="text-[10px] text-foreground/40 font-semibold">{session.business.name}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50 my-1" />
                <DropdownMenuItem
                  className="rounded-xl px-3 py-2 text-xs font-semibold focus:bg-primary/10 focus:text-primary cursor-pointer"
                  onClick={() => {
                    signOut();
                    navigate({ to: "/login" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Nav */}
        <nav className="flex gap-2 overflow-x-auto border-b border-border bg-card px-4 py-3 md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "whitespace-nowrap rounded-xl px-4 py-1.5 text-xs font-bold transition-all",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary-tint text-foreground/60"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Main Content */}
        <main className="min-w-0 flex-1 px-6 py-8 md:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
