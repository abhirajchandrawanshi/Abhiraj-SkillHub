import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Users,
  TrendingUp,
  Package,
  Eye,
  Star,
  MessageSquare,
  ShoppingBag,
  ArrowRight,
  BarChart3,
  RefreshCw,
} from "lucide-react";

import { getDashboardStatsClient } from "@/services/database/admin";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminAuth } from "@/features/auth/use-admin-auth";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | Admin" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { isAdmin, adminUser } = useAdminAuth();

  const {
    data: statsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      if (!isAdmin || !adminUser) throw new Error("Not authenticated as admin");
      if (typeof window === "undefined") throw new Error("Cannot fetch on server");
      return getDashboardStatsClient();
    },
    enabled: isAdmin && !!adminUser && typeof window !== "undefined",
    // Dashboard data refreshes every 60s (was 15s — too aggressive for Firestore reads)
    refetchInterval: 60_000,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const stats = statsData?.stats || {
    totalCourses: 0,
    publishedCourses: 0,
    totalUsers: 0,
    totalPurchases: 0,
    totalRevenue: 0,
  };

  const statCards = [
    {
      title: "Total Courses",
      value: stats.totalCourses,
      icon: Package,
      gradient: "from-blue-500 to-blue-600",
      lightBg: "bg-blue-50",
      textColor: "text-blue-600",
      description: "In system",
    },
    {
      title: "Published",
      value: stats.publishedCourses,
      icon: Eye,
      gradient: "from-emerald-500 to-green-600",
      lightBg: "bg-emerald-50",
      textColor: "text-emerald-600",
      description: "Live on site",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      gradient: "from-violet-500 to-indigo-600",
      lightBg: "bg-violet-50",
      textColor: "text-violet-600",
      description: "Registered",
    },
    {
      title: "Enrollments",
      value: stats.totalPurchases,
      icon: ShoppingBag,
      gradient: "from-orange-500 to-amber-600",
      lightBg: "bg-orange-50",
      textColor: "text-orange-600",
      description: "Total purchases",
    },
  ];

  if (isLoading) {
    return (
      <AdminShell>
        <div className="space-y-6">
          {/* Skeleton header */}
          <div className="h-8 w-48 rounded-lg bg-slate-200 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-200 animate-pulse" />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <BarChart3 className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-slate-600 font-medium">Failed to load dashboard stats</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6 max-w-6xl">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
            <p className="text-sm text-slate-700 font-medium mt-0.5">
              Real-time overview of your platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              to="/admin/courses"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Manage Courses
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.title}
              className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-md`}
                >
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stat.lightBg} ${stat.textColor}`}
                >
                  {stat.description}
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
              <div className="text-sm font-semibold text-slate-700 mt-1">{stat.title}</div>
              {/* Decorative circle */}
              <div
                className={`absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-gradient-to-br ${stat.gradient} opacity-5`}
              />
            </div>
          ))}
        </div>

        {/* Quick actions row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/admin/courses"
            className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-violet-200 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <BookOpen className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Manage Courses</p>
              <p className="text-xs font-medium text-slate-600">Add, edit, publish</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
          <Link
            to="/admin/offers"
            className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Bundle Offers</p>
              <p className="text-xs font-medium text-slate-600">Create & manage deals</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">System Status</p>
              <p className="text-xs text-green-600 font-medium">All systems operational</p>
            </div>
          </div>
        </div>

        {/* ── Course Ratings & Sales ── */}
        {stats.courseStats && stats.courseStats.length > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Course Ratings & Sales</h3>
                  <p className="text-xs font-medium text-slate-600">
                    Actual ratings submitted by users
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                {stats.courseStats.length} courses
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {stats.courseStats.map((course: any) => {
                const r = course.ratings || { total: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                const avgRating =
                  r.total > 0
                    ? (r[5] * 5 + r[4] * 4 + r[3] * 3 + r[2] * 2 + r[1] * 1) / r.total
                    : 0;
                return (
                  <div key={course.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="font-semibold text-slate-800 text-sm leading-snug">
                        {course.title}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                          {course.purchases} sales
                        </span>
                        {r.total > 0 && (
                          <span className="text-xs font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">
                            {r.total} ratings
                          </span>
                        )}
                      </div>
                    </div>

                    {r.total > 0 ? (
                      <div className="flex items-start gap-6">
                        {/* Avg score */}
                        <div className="flex flex-col items-center">
                          <span className="text-3xl font-black text-slate-900 leading-none">
                            {avgRating.toFixed(1)}
                          </span>
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= Math.round(avgRating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-200 fill-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-medium text-slate-600 mt-1">
                            avg score
                          </span>
                        </div>
                        {/* Bar breakdown */}
                        <div className="flex-1 space-y-1">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = r[star] || 0;
                            const pct = r.total > 0 ? Math.round((count / r.total) * 100) : 0;
                            return (
                              <div key={star} className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-slate-600 w-5 text-right shrink-0">
                                  {star}★
                                </span>
                                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 w-5 shrink-0">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        No ratings yet for this course
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── User Feedback & Suggestions ── */}
        {stats.suggestions !== undefined && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                  <MessageSquare className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">User Suggestions & Feedback</h3>
                  <p className="text-xs font-medium text-slate-600">
                    Messages submitted from the website
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                {(stats.suggestions as any[]).length} total
              </span>
            </div>

            {(stats.suggestions as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-600">No feedback yet</p>
                <p className="text-xs font-medium text-slate-500">
                  User suggestions will appear here once submitted
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
                {(stats.suggestions as any[]).map((s, i) => {
                  const initials = (s.name || "?")
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const dateStr = s.createdAt
                    ? new Date(s.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <div
                      key={i}
                      className="flex gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {initials}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1.5">
                          <span className="text-sm font-bold text-slate-800">
                            {s.name || "Anonymous"}
                          </span>
                          {dateStr && (
                            <span className="shrink-0 text-[11px] text-slate-500 font-semibold">
                              {dateStr}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                          {s.feedback}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
