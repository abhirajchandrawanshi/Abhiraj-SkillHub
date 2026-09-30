import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, LogOut, Menu, X, Tag, ExternalLink, ShieldCheck } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useAdminAuth } from "@/features/auth/use-admin-auth";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const { isAdmin, loading, adminLogout, adminData } = useAdminAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      void navigate({ to: "/admin/login", replace: true });
    }
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm text-slate-400">Authenticating…</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await adminLogout();
    void navigate({ to: "/admin/login" });
  };

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, description: "Stats & overview" },
    { name: "Courses", href: "/admin/courses", icon: BookOpen, description: "Manage catalog" },
    { name: "Offers", href: "/admin/offers", icon: Tag, description: "Bundle deals" },
  ];

  const pageTitle = navigation.find(n => currentPath.startsWith(n.href))?.name ?? "Admin";
  const initials = (adminData?.email ?? "A").slice(0, 1).toUpperCase();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight">AbhiAcademy</p>
          <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">Admin Panel</p>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation</p>
        {navigation.map((item) => {
          const active = currentPath.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href as any}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 ${
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                active
                  ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/40"
                  : "bg-white/5 group-hover:bg-white/10"
              }`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-none ${active ? "text-white" : ""}`}>{item.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
              </div>
              {active && <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
            </Link>
          );
        })}
      </nav>

      {/* View site shortcut */}
      <div className="px-3 pb-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <ExternalLink className="h-4 w-4" />
          <span>View Website</span>
        </Link>
      </div>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold shadow">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Administrator</p>
            <p className="text-xs text-slate-500 truncate">{adminData?.email ?? ""}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-6 shadow-sm">
          <button
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-slate-600 font-semibold hidden sm:block">Admin</span>
            <span className="text-xs text-slate-500 hidden sm:block">/</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{pageTitle}</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold shadow">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
