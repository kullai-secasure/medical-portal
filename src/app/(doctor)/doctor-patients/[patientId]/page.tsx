import { notFound } from "next/navigation";
import { AlertTriangle, Pill, FlaskConical, Stethoscope, Share2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { logAccess } from "@/lib/audit";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateAge, formatDate, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

async function assertDoctorHasAccess(doctorId: string, patientId: string) {
  const [viaAppointment, viaRecord, viaReferral] = await Promise.all([
    prisma.appointment.findFirst({ where: { doctorId, patientId } }),
    prisma.medicalRecord.findFirst({ where: { doctorId, patientId } }),
    prisma.referral.findFirst({
      where: { specialistDoctorId: doctorId, patientId, status: { in: ["ACCEPTED", "COMPLETED"] } },
    }),
  ]);
  return Boolean(viaAppointment || viaRecord || viaReferral);
}

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) throw new Error("Doctor profile not found");

  const hasAccess = await assertDoctorHasAccess(doctor.id, patientId);
  if (!hasAccess) notFound();

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      user: true,
      medicalRecords: { orderBy: { visitDate: "desc" }, include: { doctor: { include: { user: true } } } },
      prescriptions: { orderBy: { startDate: "desc" }, include: { doctor: { include: { user: true } } } },
      labResults: { orderBy: { orderedDate: "desc" }, include: { doctor: { include: { user: true } } } },
    },
  });

  if (!patient) notFound();

  await logAccess(session.user.id, "VIEW", "Patient", `Viewed medical record for ${patient.user.firstName} ${patient.user.lastName}`, {
    patientId: patient.id,
  });

  const activeReferral = await prisma.referral.findFirst({
    where: { patientId, specialistDoctorId: doctor.id, status: "ACCEPTED" },
    include: { referringDoctor: { include: { user: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${patient.user.firstName} ${patient.user.lastName}`}
        description={`${calculateAge(patient.dateOfBirth)} years old · ${titleCase(patient.gender)} · Blood type ${patient.bloodType ?? "unknown"}`}
      />

      {activeReferral && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Share2 className="size-4 text-primary" />
            <p className="text-sm text-foreground">
              Shared with you via referral from Dr. {activeReferral.referringDoctor.user.firstName}{" "}
              {activeReferral.referringDoctor.user.lastName}: {activeReferral.reason}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            Allergies &amp; Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {patient.allergies.map((a) => (
              <Badge key={a} variant="outline" className="border-destructive/30 text-destructive">
                {a}
              </Badge>
            ))}
            {patient.allergies.length === 0 && <span className="text-sm text-muted-foreground">No known allergies</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {patient.chronicConditions.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="size-4 text-primary" />
            Visit History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {patient.medicalRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">No visit history.</p>
          )}
          {patient.medicalRecords.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <p className="font-medium text-foreground">{r.diagnosis}</p>
              <p className="text-sm text-muted-foreground">
                Dr. {r.doctor.user.lastName} &middot; {formatDate(r.visitDate)}
              </p>
              {r.treatment && <p className="mt-1 text-sm text-foreground">{r.treatment}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="size-4 text-primary" />
              Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {patient.prescriptions.length === 0 && (
              <p className="text-sm text-muted-foreground">No prescriptions.</p>
            )}
            {patient.prescriptions.map((rx) => (
              <div key={rx.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{rx.medicationName}</p>
                  <p className="text-xs text-muted-foreground">{rx.dosage} &middot; {rx.frequency}</p>
                </div>
                <StatusBadge status={rx.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" />
              Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {patient.labResults.length === 0 && (
              <p className="text-sm text-muted-foreground">No lab results.</p>
            )}
            {patient.labResults.map((lab) => (
              <div key={lab.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{lab.testName}</p>
                  <p className="text-xs text-muted-foreground">
                    {lab.resultValue ? `${lab.resultValue} ${lab.units ?? ""}` : "Pending"}
                  </p>
                </div>
                <StatusBadge status={lab.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
