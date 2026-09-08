import { ArrowRight, ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getDoctorPatients } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateReferralDialog } from "@/components/doctor/create-referral-dialog";
import { ReferralResponseButtons } from "@/components/doctor/referral-response-buttons";
import { formatDate, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DoctorReferralsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) throw new Error("Doctor profile not found");

  const [sent, received, patients, allDoctors] = await Promise.all([
    prisma.referral.findMany({
      where: { referringDoctorId: doctor.id },
      include: { patient: { include: { user: true } }, specialistDoctor: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findMany({
      where: { specialistDoctorId: doctor.id },
      include: { patient: { include: { user: true } }, referringDoctor: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getDoctorPatients(doctor.id),
    prisma.doctor.findMany({ where: { id: { not: doctor.id } }, include: { user: true } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Referrals"
        description="Refer patients to specialists and manage incoming referral requests."
        action={<CreateReferralDialog patients={patients} doctors={allDoctors} />}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <ArrowRight className="size-4" />
          Sent by You
        </h2>
        {sent.length === 0 && (
          <p className="text-sm text-muted-foreground">No referrals sent yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {sent.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {r.patient.user.firstName} {r.patient.user.lastName} &rarr; Dr.{" "}
                    {r.specialistDoctor.user.firstName} {r.specialistDoctor.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{r.reason}</p>
                  <p className="text-xs text-muted-foreground">Sent {formatDate(r.createdAt)}</p>
                </div>
                <StatusBadge status={r.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <ArrowLeft className="size-4" />
          Received
        </h2>
        {received.length === 0 && (
          <p className="text-sm text-muted-foreground">No referrals received yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {received.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {r.patient.user.firstName} {r.patient.user.lastName} from Dr.{" "}
                    {r.referringDoctor.user.firstName} {r.referringDoctor.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{r.reason}</p>
                  {r.notes && <p className="text-sm text-muted-foreground">Notes: {r.notes}</p>}
                  <p className="text-xs text-muted-foreground">Received {formatDate(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <StatusBadge status={r.status} />
                  <ReferralResponseButtons referralId={r.id} status={r.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
