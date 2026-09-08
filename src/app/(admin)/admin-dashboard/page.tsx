import { Users, Stethoscope, BarChart3, Settings } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  const [patientCount, doctorCount, appointmentCount, userCount] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.appointment.count(),
    prisma.user.count(),
  ]);

  const stats = [
    { label: "Total Patients", value: patientCount, icon: Users },
    { label: "Total Doctors", value: doctorCount, icon: Stethoscope },
    { label: "Total Users", value: userCount, icon: Users },
    { label: "Total Appointments", value: appointmentCount, icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="System administration and analytics"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-4" />
            System Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground">Create, edit, or disable user accounts</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <p className="font-medium">Manage Departments</p>
              <p className="text-sm text-muted-foreground">Organize doctors and staff by department</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <p className="font-medium">View Analytics</p>
              <p className="text-sm text-muted-foreground">System-wide performance metrics</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <p className="font-medium">System Logs</p>
              <p className="text-sm text-muted-foreground">Monitor system activity and errors</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
