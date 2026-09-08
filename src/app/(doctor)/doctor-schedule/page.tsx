import { CalendarOff, Clock } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BlockSlotDialog } from "@/components/doctor/block-slot-dialog";
import { UnblockSlotButton } from "@/components/doctor/unblock-slot-button";
import { formatDateTime, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DoctorSchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const doctor = await prisma.doctor.findUnique({
    where: { userId: session.user.id },
    include: { availability: true },
  });
  if (!doctor) throw new Error("Doctor profile not found");

  const blockedSlots = await prisma.blockedSlot.findMany({
    where: { doctorId: doctor.id, endTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="My Schedule"
        description="Manage your recurring availability and block off time when you're unavailable."
        action={<BlockSlotDialog />}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Clock className="size-4" />
          Weekly Availability
        </h2>
        <Card>
          <CardContent className="pt-6">
            {doctor.availability.length === 0 && (
              <p className="text-sm text-muted-foreground">No recurring availability set.</p>
            )}
            <div className="flex flex-col gap-2">
              {doctor.availability.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="font-medium text-foreground">{titleCase(a.dayOfWeek)}</span>
                  <span className="text-muted-foreground">{a.startTime} – {a.endTime}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <CalendarOff className="size-4" />
          Blocked Time
        </h2>
        {blockedSlots.length === 0 && (
          <p className="text-sm text-muted-foreground">No blocked time slots.</p>
        )}
        <div className="flex flex-col gap-3">
          {blockedSlots.map((slot) => (
            <Card key={slot.id}>
              <CardContent className="flex flex-col gap-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {formatDateTime(slot.startTime)} – {formatDateTime(slot.endTime)}
                  </p>
                  {slot.reason && <p className="text-sm text-muted-foreground">{slot.reason}</p>}
                </div>
                <UnblockSlotButton blockedSlotId={slot.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
