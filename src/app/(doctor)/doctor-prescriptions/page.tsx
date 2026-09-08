import { Pill, Clock } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getDoctorPatients } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreatePrescriptionDialog } from "@/components/doctor/create-prescription-dialog";
import { RefillApprovalButtons } from "@/components/doctor/refill-approval-buttons";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DoctorPrescriptionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) throw new Error("Doctor profile not found");

  const [pendingRefills, prescriptions, patients] = await Promise.all([
    prisma.refillRequest.findMany({
      where: { prescription: { doctorId: doctor.id }, status: "PENDING" },
      include: { prescription: true, patient: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.prescription.findMany({
      where: { doctorId: doctor.id },
      include: { patient: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getDoctorPatients(doctor.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Prescriptions"
        description="Manage prescriptions and refill requests for your patients."
        action={<CreatePrescriptionDialog patients={patients} />}
      />

      {pendingRefills.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Clock className="size-4" />
            Pending Refill Requests
          </h2>
          <div className="flex flex-col gap-3">
            {pendingRefills.map((req) => (
              <Card key={req.id}>
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {req.prescription.medicationName} &middot; {req.patient.user.firstName}{" "}
                      {req.patient.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {req.prescription.dosage} &middot; {req.prescription.refillsRemaining} refills remaining
                    </p>
                    {req.requestNote && (
                      <p className="text-sm text-muted-foreground">Note: {req.requestNote}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Requested {formatDate(req.createdAt)}</p>
                  </div>
                  <RefillApprovalButtons refillRequestId={req.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          All Prescriptions
        </h2>
        {prescriptions.length === 0 && (
          <p className="text-sm text-muted-foreground">No prescriptions written yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {prescriptions.map((rx) => (
            <Card key={rx.id}>
              <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Pill className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{rx.medicationName}</p>
                    <p className="text-sm text-muted-foreground">
                      {rx.patient.user.firstName} {rx.patient.user.lastName} &middot; {rx.dosage} &middot;{" "}
                      {rx.frequency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rx.refillsRemaining}/{rx.maxRefills} refills remaining
                    </p>
                  </div>
                </div>
                <StatusBadge status={rx.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
