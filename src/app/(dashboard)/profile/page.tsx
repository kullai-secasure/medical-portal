import {
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  HeartPulse,
  AlertTriangle,
  Contact,
  Link2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShareRecordsDialog } from "@/components/profile/share-records-dialog";
import { RevokeShareLinkButton } from "@/components/profile/revoke-share-link-button";
import { prisma } from "@/lib/prisma";
import { getCurrentPatient } from "@/lib/data";
import { calculateAge, formatDate, formatDateTime, initials, titleCase } from "@/lib/format";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

export default async function ProfilePage() {
  const patient = await getCurrentPatient();
  const shareLinks = await prisma.shareLink.findMany({
    where: { patientId: patient.id, isRevoked: false, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Profile"
        description="Your personal information, medical history, and insurance details."
        action={<ShareRecordsDialog />}
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center sm:flex-row sm:text-left">
          <Avatar className="size-20">
            <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
              {initials(patient.user.firstName, patient.user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {patient.user.firstName} {patient.user.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {calculateAge(patient.dateOfBirth)} years old &middot;{" "}
              {titleCase(patient.gender)} &middot; Blood type{" "}
              {patient.bloodType ?? "unknown"}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              {patient.allergies.map((a) => (
                <Badge key={a} variant="outline" className="border-destructive/30 text-destructive">
                  <AlertTriangle className="size-3" />
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Contact className="size-4 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <InfoRow
              label="Email"
              value={
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  {patient.user.email}
                </span>
              }
            />
            <InfoRow
              label="Phone"
              value={
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {patient.phone}
                </span>
              }
            />
            <InfoRow label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
            <InfoRow label="Gender" value={titleCase(patient.gender)} />
            <Separator />
            <InfoRow
              label="Address"
              value={
                <span className="flex items-start gap-1.5 text-right">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    {patient.addressLine1}
                    {patient.addressLine2 ? `, ${patient.addressLine2}` : ""}
                    <br />
                    {patient.city}, {patient.state} {patient.zipCode}
                  </span>
                </span>
              }
            />
            <Separator />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Emergency Contact
            </p>
            <InfoRow label="Name" value={patient.emergencyContactName} />
            <InfoRow label="Relationship" value={patient.emergencyContactRelation} />
            <InfoRow label="Phone" value={patient.emergencyContactPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="size-4 text-primary" />
              Medical History
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <InfoRow label="Blood Type" value={patient.bloodType} />
            <InfoRow
              label="Height"
              value={patient.heightCm ? `${patient.heightCm} cm` : undefined}
            />
            <InfoRow
              label="Weight"
              value={patient.weightKg ? `${patient.weightKg} kg` : undefined}
            />
            <Separator />
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Allergies
              </p>
              <div className="flex flex-wrap gap-2">
                {patient.allergies.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No known allergies
                  </span>
                )}
                {patient.allergies.map((a) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Chronic Conditions
              </p>
              <div className="flex flex-wrap gap-2">
                {patient.chronicConditions.length === 0 && (
                  <span className="text-sm text-muted-foreground">None reported</span>
                )}
                {patient.chronicConditions.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current Medications
              </p>
              <div className="flex flex-wrap gap-2">
                {patient.currentMedications.length === 0 && (
                  <span className="text-sm text-muted-foreground">None reported</span>
                )}
                {patient.currentMedications.map((m) => (
                  <Badge key={m} variant="secondary">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Insurance Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <InfoRow label="Provider" value={patient.insuranceProvider} />
            <InfoRow label="Plan Type" value={patient.insurancePlanType} />
            <InfoRow label="Policy Number" value={patient.insurancePolicyNumber} />
            <InfoRow label="Group Number" value={patient.insuranceGroupNumber} />
          </CardContent>
        </Card>

        {shareLinks.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="size-4 text-primary" />
                Active Share Links
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {shareLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm text-foreground">Expires {formatDateTime(link.expiresAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      Viewed {link.viewCount} time{link.viewCount === 1 ? "" : "s"}
                      {link.lastViewedAt ? ` · last viewed ${formatDateTime(link.lastViewedAt)}` : ""}
                    </p>
                  </div>
                  <RevokeShareLinkButton shareLinkId={link.id} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
