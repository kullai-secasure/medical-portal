import Link from "next/link";
import {
  CalendarClock,
  Pill,
  FlaskConical,
  FileText,
  ArrowRight,
  Video,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getCurrentPatient,
  getUpcomingAppointments,
  getPrescriptions,
  getLabResults,
  getMedicalRecords,
} from "@/lib/data";
import { formatDateTime, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const patient = await getCurrentPatient();
  const [upcoming, prescriptions, labResults, records] = await Promise.all([
    getUpcomingAppointments(patient.id),
    getPrescriptions(patient.id),
    getLabResults(patient.id),
    getMedicalRecords(patient.id),
  ]);

  const activePrescriptions = prescriptions.filter((p) => p.status === "ACTIVE");
  const pendingLabs = labResults.filter((l) => l.status === "PENDING");

  const stats = [
    {
      label: "Upcoming Appointments",
      value: upcoming.length,
      icon: CalendarClock,
      href: "/appointments",
    },
    {
      label: "Active Prescriptions",
      value: activePrescriptions.length,
      icon: Pill,
      href: "/prescriptions",
    },
    {
      label: "Pending Lab Results",
      value: pendingLabs.length,
      icon: FlaskConical,
      href: "/records",
    },
    {
      label: "Medical Records",
      value: records.length,
      icon: FileText,
      href: "/records",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Welcome back, ${patient.user.firstName}`}
        description="Here's a snapshot of your health, all in one place."
        action={
          <Button asChild>
            <Link href="/appointments">
              <CalendarClock className="size-4" />
              Book Appointment
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <stat.icon className="size-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/appointments">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcoming.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming appointments. Book one to get started.
              </p>
            )}
            {upcoming.map((appt) => (
              <div
                key={appt.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    {appt.type === "TELEHEALTH" ? (
                      <Video className="size-4" />
                    ) : (
                      <MapPin className="size-4" />
                    )}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      Dr. {appt.doctor.user.firstName} {appt.doctor.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appt.reason}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(appt.scheduledAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {activePrescriptions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No active prescriptions.
              </p>
            )}
            {activePrescriptions.slice(0, 4).map((rx) => (
              <div key={rx.id} className="rounded-lg border p-3">
                <p className="font-medium text-foreground">
                  {rx.medicationName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {rx.dosage} &middot; {rx.frequency}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Since {formatDate(rx.startDate)}
                </p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-1" asChild>
              <Link href="/prescriptions">
                View all prescriptions
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
