import { ClipboardList, Users, Activity, AlertCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export default async function NurseDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const nurse = await prisma.nurse.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });

  if (!nurse) {
    throw new Error("Nurse profile not found");
  }

  // Get patients in the nurse's department (via doctors)
  const doctors = await prisma.doctor.findMany({
    where: { department: nurse.department },
  });

  const doctorIds = doctors.map((d) => d.id);

  const [appointments, vitalsRecorded, patients] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        doctorId: { in: doctorIds },
        scheduledAt: { gte: new Date() },
        status: { not: "CANCELLED" },
      },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
      take: 10,
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.vitals.findMany({
      orderBy: { recordedAt: "desc" },
      take: 5,
      include: { patient: { include: { user: true } } },
    }),
    prisma.patient.findMany({
      take: 10,
    }),
  ]);

  const stats = [
    { label: "Upcoming Appointments", value: appointments.length, icon: ClipboardList },
    { label: "Vitals Recorded Today", value: vitalsRecorded.length, icon: Activity },
    { label: "Department Patients", value: patients.length, icon: Users },
    { label: "Active Alerts", value: 2, icon: AlertCircle },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${nurse.user.firstName} ${nurse.user.lastName}`}
        description={`RN • ${nurse.department.replace(/_/g, " ")} Department`}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments to Check In</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No upcoming appointments
              </p>
            )}
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div key={appt.id} className="border rounded-lg p-3">
                  <p className="font-medium text-foreground">
                    {appt.patient.user.firstName} {appt.patient.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dr. {appt.doctor.user.firstName} {appt.doctor.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(appt.scheduledAt)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            {vitalsRecorded.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No vitals recorded yet
              </p>
            )}
            <div className="space-y-3">
              {vitalsRecorded.map((vital) => (
                <div key={vital.id} className="border rounded-lg p-3">
                  <p className="font-medium text-foreground">
                    {vital.patient.user.firstName} {vital.patient.user.lastName}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    {vital.bloodPressure && (
                      <p className="text-muted-foreground">BP: {vital.bloodPressure}</p>
                    )}
                    {vital.heartRateBpm && (
                      <p className="text-muted-foreground">HR: {vital.heartRateBpm}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
