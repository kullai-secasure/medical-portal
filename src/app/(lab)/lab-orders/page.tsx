import { FlaskConical, CheckCircle2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { UploadResultDialog } from "@/components/lab/upload-result-dialog";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LabOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const labTech = await prisma.labTechnician.findUnique({ where: { userId: session.user.id } });
  if (!labTech) throw new Error("Lab technician profile not found");

  const [pending, recentlyCompleted] = await Promise.all([
    prisma.labResult.findMany({
      where: { status: "PENDING" },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
      orderBy: { orderedDate: "asc" },
    }),
    prisma.labResult.findMany({
      where: { status: { in: ["COMPLETED", "ABNORMAL"] } },
      include: { patient: { include: { user: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Lab Orders"
        description="Upload results for pending test orders."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <FlaskConical className="size-4" />
          Pending ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground">No pending lab orders.</p>
        )}
        <div className="flex flex-col gap-3">
          {pending.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{order.testName}</p>
                  <p className="text-sm text-muted-foreground">
                    Patient: {order.patient.user.firstName} {order.patient.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ordered by Dr. {order.doctor.user.lastName} &middot; {formatDate(order.orderedDate)}
                  </p>
                </div>
                <UploadResultDialog labResultId={order.id} testName={order.testName} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          Recently Completed
        </h2>
        {recentlyCompleted.length === 0 && (
          <p className="text-sm text-muted-foreground">No completed results yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {recentlyCompleted.map((order) => (
            <Card key={order.id} className="opacity-90">
              <CardContent className="flex flex-col gap-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{order.testName}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.patient.user.firstName} {order.patient.user.lastName} &middot;{" "}
                    {order.resultValue} {order.units}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
