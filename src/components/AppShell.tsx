import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FilePlus2, ClipboardList, Truck, Building2,
  BookUser, BarChart3, Settings, Moon, Sun, Menu, History, Trash2,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useSettings, useDispatches } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationPanel } from "@/components/NotificationPanel";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dispatch/new", label: "New Dispatch", icon: FilePlus2 },
  { to: "/consignments", label: "Consignment List", icon: ClipboardList },
  { to: "/trucks", label: "Fleet Management", icon: Truck },
  { to: "/consignors", label: "Consignor Management", icon: Building2 },
  { to: "/consignees", label: "Consignee Management", icon: BookUser },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit-log", label: "Audit Log", icon: History },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children, title, breadcrumb }: { children: ReactNode; title: string; breadcrumb?: string[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [settings, setSettings] = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (settings.darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [settings.darkMode]);

  // Update favicon whenever logo changes
  useEffect(() => {
    const logo = settings.company.logo;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (logo) {
      link.href = logo;
      link.type = "image/png";
    } else {
      link.href = "/favicon.ico";
      link.type = "image/x-icon";
    }
  }, [settings.company.logo]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          {settings.company.logo ? (
            <img src={settings.company.logo} alt="logo" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 font-bold">
              {(settings.company.name || "SR").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="leading-tight min-w-0">
            <div className="truncate text-base font-semibold">{settings.company.name || "Sahil Road Lines"}</div>
            <div className="text-[11px] uppercase tracking-wider text-white/60">Transport ERP</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6 no-print">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })}
              aria-label="Toggle theme"
            >
              {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <NotificationPanel />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-muted">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    AD
                  </div>
                  <span className="hidden text-sm font-medium sm:block">Admin</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page header */}
        <div className="border-b bg-card/50 px-4 py-5 sm:px-6 no-print">
          <div className="text-xs text-muted-foreground">
            {(breadcrumb ?? ["Home", title]).join(" / ")}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        </div>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
