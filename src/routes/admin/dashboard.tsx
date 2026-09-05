import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Users,
  DollarSign,
  TrendingUp,
  Package,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStatsClient } from "@/lib/admin";
import { AdminShell } from "@/components/AdminShell";
import { Link } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/use-admin-auth";

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
  } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      if (!isAdmin || !adminUser) throw new Error("Not authenticated as admin");
      if (typeof window === 'undefined') throw new Error("Cannot fetch on server");
      
      return getDashboardStatsClient();
    },
    enabled: isAdmin && !!adminUser && typeof window !== 'undefined',
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
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "All courses in system",
    },
    {
      title: "Published Courses",
      value: stats.publishedCourses,
      icon: Eye,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Live on website",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Registered learners",
    },
    {
      title: "Total Purchases",
      value: stats.totalPurchases,
      icon: BookOpen,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Course enrollments",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: "Lifetime earnings",
    },
  ];

  const content = (() => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-8 w-16 bg-slate-200 rounded" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load dashboard statistics. Please try again.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Overview of your course platform
            </p>
          </div>
          <Link to="/admin/courses">
            <Button>
              <BookOpen className="h-4 w-4 mr-2" />
              Manage Courses
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/admin/courses" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Add New Course
                </Button>
              </Link>
              <Link to="/admin/courses" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View All Courses
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Payment System
                </span>
                <span className="text-sm font-medium text-green-600">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Email Service
                </span>
                <span className="text-sm font-medium text-green-600">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database</span>
                <span className="text-sm font-medium text-green-600">
                  Connected
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  })();

  return <AdminShell>{content}</AdminShell>;
}
