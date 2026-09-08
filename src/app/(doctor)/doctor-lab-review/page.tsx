import { FileCheck, FileClock } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ReleaseResultDialog } from "@/components/doctor/release-result-dialog";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DoctorLabReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) throw new Error("Doctor profile not found");

  const [awaitingReview, released] = await Promise.all([
    prisma.labResult.findMany({
      where: { doctorId: doctor.id, status: { in: ["COMPLETED", "ABNORMAL"] }, isReleased: false },
      include: { patient: { include: { user: true } } },
      orderBy: { resultDate: "asc" },
    }),
    prisma.labResult.findMany({
      where: { doctorId: doctor.id, isReleased: true },
      include: { patient: { include: { user: true } } },
      orderBy: { reviewedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Lab Result Review"
        description="Review lab results before they're released to patients."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <FileClock className="size-4" />
          Awaiting Review ({awaitingReview.length})
        </h2>
        {awaitingReview.length === 0 && (
          <p className="text-sm text-muted-foreground">No results awaiting review.</p>
        )}
        <div className="flex flex-col gap-3">
          {awaitingReview.map((result) => (
            <Card key={result.id} className={result.status === "ABNORMAL" ? "border-destructive/40" : undefined}>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {result.testName}
                    {result.status === "ABNORMAL" && (
                      <span className="ml-2 text-xs font-semibold text-destructive">ABNORMAL</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.patient.user.firstName} {result.patient.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Result: {result.resultValue} {result.units}{" "}
                    {result.normalRange && `(normal: ${result.normalRange})`}
                  </p>
                  {result.fileUrl && (
                    <a
                      href={result.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline underline-offset-2"
                    >
                      View attached file
                    </a>
                  )}
                </div>
                <ReleaseResultDialog labResultId={result.id} testName={result.testName} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <FileCheck className="size-4" />
          Recently Released
        </h2>
        {released.length === 0 && (
          <p className="text-sm text-muted-foreground">No results released yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {released.map((result) => (
            <Card key={result.id} className="opacity-90">
              <CardContent className="flex flex-col gap-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{result.testName}</p>
                  <p className="text-sm text-muted-foreground">
                    {result.patient.user.firstName} {result.patient.user.lastName}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Released {result.reviewedAt ? formatDate(result.reviewedAt) : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
