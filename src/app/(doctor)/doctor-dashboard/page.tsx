import { Clock, Users, FileText, AlertCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDate } from "@/lib/format";

export default async function DoctorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const doctor = await prisma.doctor.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });

  if (!doctor) {
    throw new Error("Doctor profile not found");
  }

  const [todaysAppointments, upcomingAppointments, patients, prescriptions, labOrders] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { patient: { include: { user: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledAt: { gte: new Date() },
        status: { not: "CANCELLED" },
      },
      include: { patient: { include: { user: true } } },
      take: 5,
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { doctorId: doctor.id, status: "COMPLETED" },
      distinct: ["patientId"],
      include: { patient: { include: { user: true } } },
    }),
    prisma.prescription.findMany({
      where: { doctorId: doctor.id, status: "ACTIVE" },
      include: { patient: { include: { user: true } } },
    }),
    prisma.labResult.findMany({
      where: { doctorId: doctor.id, status: "PENDING" },
      include: { patient: { include: { user: true } } },
    }),
  ]);

  const stats = [
    { label: "Today's Appointments", value: todaysAppointments.length, icon: Clock },
    { label: "Total Patients", value: patients.length, icon: Users },
    { label: "Active Prescriptions", value: prescriptions.length, icon: FileText },
    { label: "Pending Lab Orders", value: labOrders.length, icon: AlertCircle },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`}
        description={`${doctor.specialty} • ${doctor.department.replace(/_/g, " ")}`}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysAppointments.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No appointments scheduled for today
              </p>
            )}
            <div className="space-y-3">
              {todaysAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center gap-4 border rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {appt.patient.user.firstName} {appt.patient.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{appt.reason}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(appt.scheduledAt)}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Lab Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {labOrders.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No pending lab orders
              </p>
            )}
            <div className="space-y-2">
              {labOrders.slice(0, 5).map((lab) => (
                <div key={lab.id} className="text-sm border rounded p-2">
                  <p className="font-medium text-foreground">{lab.testName}</p>
                  <p className="text-xs text-muted-foreground">
                    {lab.patient.user.firstName} {lab.patient.user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ordered: {formatDate(lab.orderedDate)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
