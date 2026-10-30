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
    <Link to="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Activity className="h-4 w-4" />
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-bold tracking-tight text-foreground">BrandPulse</span>
        <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Sentiment Monitoring
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
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                <span className="truncate">{item.label}</span>
                {item.to === "/alerts" && unread > 0 ? (
                  <span className="text-numeric ml-auto rounded bg-risk-critical/15 px-1.5 text-[10px] font-semibold text-risk-critical">
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Business</p>
          <p className="mt-1 truncate text-xs text-sidebar-foreground/80">{session.business.name}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to="/mentions">
                <MessageSquareText className="h-4 w-4" /> Add mentions
              </Link>
            </Button>
            <Link
              to="/alerts"
              className="relative flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Alerts"
            >
              <BellRing className="h-4 w-4" />
              {unread > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-risk-critical" />
              ) : null}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 items-center gap-2 rounded-md border border-input px-2.5 text-xs font-medium text-foreground">
                  <span className="hidden max-w-[160px] truncate sm:inline">{session.user.email}</span>
                  <span className="sm:hidden">Account</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{session.business.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
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

        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
