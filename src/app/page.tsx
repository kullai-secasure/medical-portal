import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const roleRoutes: Record<string, string> = {
    PATIENT: "/dashboard",
    DOCTOR: "/doctor-dashboard",
    NURSE: "/nurse-dashboard",
    LAB_TECHNICIAN: "/lab-dashboard",
    ADMIN: "/admin-dashboard",
  };

  const dashboardRoute = roleRoutes[session.user.role] || "/dashboard";
  redirect(dashboardRoute);
}
