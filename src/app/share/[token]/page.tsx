import { AlertTriangle, HeartPulse, Pill, FlaskConical, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { logAccess } from "@/lib/audit";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateAge, formatDate, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getShareLinkData(token: string) {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      patient: {
        include: {
          user: true,
          prescriptions: { where: { status: "ACTIVE" } },
          labResults: { where: { isReleased: true }, orderBy: { orderedDate: "desc" }, take: 10 },
        },
      },
    },
  });

  if (!link) return { status: "not_found" as const };
  if (link.isRevoked) return { status: "revoked" as const };
  if (link.expiresAt < new Date()) return { status: "expired" as const };

  await prisma.shareLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });

  await logAccess(
    link.patient.userId,
    "VIEW",
    "ShareLink",
    "Medical summary viewed via external share link",
    { patientId: link.patientId, resourceId: link.id }
  );

  return { status: "ok" as const, patient: link.patient, expiresAt: link.expiresAt };
}

export default async function SharedRecordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getShareLinkData(token);

  if (result.status !== "ok") {
    const messages: Record<string, string> = {
      not_found: "This link is invalid.",
      revoked: "This link has been revoked by the patient.",
      expired: "This link has expired.",
    };
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <ShieldAlert className="size-8 text-destructive" />
            <p className="font-medium text-foreground">Link Unavailable</p>
            <p className="text-sm text-muted-foreground">{messages[result.status]}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { patient, expiresAt } = result;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo />
          <Badge variant="outline" className="text-xs">
            Expires {formatDate(expiresAt)}
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h1 className="text-xl font-semibold text-foreground">
              {patient.user.firstName} {patient.user.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {calculateAge(patient.dateOfBirth)} years old &middot; {titleCase(patient.gender)} &middot; Blood
              type {patient.bloodType ?? "unknown"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />
              Allergies &amp; Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {patient.allergies.length === 0 && (
                <span className="text-sm text-muted-foreground">No known allergies</span>
              )}
              {patient.allergies.map((a) => (
                <Badge key={a} variant="outline" className="border-destructive/30 text-destructive">
                  {a}
                </Badge>
              ))}
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="size-4 text-primary" />
              Active Medications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {patient.prescriptions.length === 0 && (
              <p className="text-sm text-muted-foreground">No active prescriptions</p>
            )}
            {patient.prescriptions.map((rx) => (
              <div key={rx.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium text-foreground">{rx.medicationName}</p>
                <p className="text-muted-foreground">{rx.dosage} &middot; {rx.frequency}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-primary" />
              Recent Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {patient.labResults.length === 0 && (
              <p className="text-sm text-muted-foreground">No released lab results</p>
            )}
            {patient.labResults.map((lab) => (
              <div key={lab.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium text-foreground">{lab.testName}</p>
                <p className="text-muted-foreground">
                  {lab.resultValue} {lab.units} {lab.normalRange && `(normal: ${lab.normalRange})`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="size-4 text-primary" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">
              {patient.emergencyContactName ?? "Not provided"}
              {patient.emergencyContactRelation ? ` (${patient.emergencyContactRelation})` : ""}
            </p>
            <p className="text-sm text-muted-foreground">{patient.emergencyContactPhone}</p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          This is a temporary, view-only summary shared by the patient via MedPortal.
        </p>
      </div>
    </div>
  );
}
