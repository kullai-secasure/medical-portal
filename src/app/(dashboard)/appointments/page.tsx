import { Video, MapPin, CalendarX2, ListPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookAppointmentDialog } from "@/components/appointments/book-appointment-dialog";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { RescheduleDialog } from "@/components/appointments/reschedule-dialog";
import { JoinWaitlistDialog } from "@/components/appointments/join-waitlist-dialog";
import { prisma } from "@/lib/prisma";
import { getCurrentPatient, getAllAppointments, getDoctors } from "@/lib/data";
import { formatDateTime, titleCase } from "@/lib/format";

const CANCELLABLE = new Set(["SCHEDULED", "CONFIRMED"]);
const RESCHEDULABLE = new Set(["SCHEDULED", "CONFIRMED"]);

export default async function AppointmentsPage() {
  const patient = await getCurrentPatient();
  const [appointments, doctors, waitlistEntries] = await Promise.all([
    getAllAppointments(patient.id),
    getDoctors(),
    prisma.waitlist.findMany({
      where: { patientId: patient.id, status: "WAITING" },
      include: { doctor: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = Date.now();
  const upcoming = appointments.filter(
    (a) => new Date(a.scheduledAt).getTime() >= now && a.status !== "CANCELLED"
  );
  const past = appointments.filter(
    (a) => new Date(a.scheduledAt).getTime() < now || a.status === "CANCELLED"
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Appointments"
        description="Book, review, and manage your upcoming and past visits."
        action={
          <div className="flex gap-2">
            <JoinWaitlistDialog doctors={doctors} />
            <BookAppointmentDialog doctors={doctors} />
          </div>
        }
      />

      {waitlistEntries.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <ListPlus className="size-4" />
            On Waitlist
          </h2>
          <div className="flex flex-col gap-3">
            {waitlistEntries.map((w) => (
              <Card key={w.id}>
                <CardContent className="flex flex-col gap-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Dr. {w.doctor.user.firstName} {w.doctor.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{w.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      Preferred: {formatDateTime(w.preferredFrom)} – {formatDateTime(w.preferredTo)}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarX2 className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No upcoming appointments booked yet.
              </p>
            </CardContent>
          </Card>
        )}
        <div className="flex flex-col gap-3">
          {upcoming.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
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
                      {titleCase(appt.doctor.department)} &middot; {appt.reason}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(appt.scheduledAt)} &middot;{" "}
                      {titleCase(appt.type)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <StatusBadge status={appt.status} />
                  {RESCHEDULABLE.has(appt.status) && (
                    <RescheduleDialog appointmentId={appt.id} />
                  )}
                  {CANCELLABLE.has(appt.status) && (
                    <CancelAppointmentButton appointmentId={appt.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Past &amp; Cancelled
        </h2>
        {past.length === 0 && (
          <p className="text-sm text-muted-foreground">No past appointments.</p>
        )}
        <div className="flex flex-col gap-3">
          {past.map((appt) => (
            <Card key={appt.id} className="opacity-90">
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
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
                      {titleCase(appt.doctor.department)} &middot; {appt.reason}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(appt.scheduledAt)}
                    </p>
                    {appt.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Notes: {appt.notes}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={appt.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
