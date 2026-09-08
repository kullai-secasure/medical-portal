import { Beaker, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default async function LabDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const labTech = await prisma.labTechnician.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });

  if (!labTech) {
    throw new Error("Lab technician profile not found");
  }

  const [pendingOrders, completedToday, abnormalResults] = await Promise.all([
    prisma.labResult.findMany({
      where: { status: "PENDING" },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
      orderBy: { orderedDate: "asc" },
    }),
    prisma.labResult.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { patient: { include: { user: true } } },
    }),
    prisma.labResult.findMany({
      where: { status: "ABNORMAL" },
      orderBy: { resultDate: "desc" },
      take: 5,
      include: { patient: { include: { user: true } }, doctor: true },
    }),
  ]);

  const stats = [
    { label: "Pending Orders", value: pendingOrders.length, icon: Clock, variant: "destructive" },
    { label: "Completed Today", value: completedToday.length, icon: CheckCircle2, variant: "success" },
    { label: "Abnormal Results", value: abnormalResults.length, icon: AlertCircle, variant: "warning" },
    { label: "Total Tests", value: pendingOrders.length + completedToday.length, icon: Beaker },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${labTech.user.firstName} ${labTech.user.lastName}`}
        description="Lab Technician"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Pending Lab Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No pending orders
              </p>
            )}
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-3 bg-destructive/5">
                  <p className="font-medium text-foreground">{order.testName}</p>
                  <p className="text-sm text-muted-foreground">
                    Patient: {order.patient.user.firstName} {order.patient.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ordered: {formatDate(order.orderedDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dr. {order.doctor.user.firstName} {order.doctor.user.lastName}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              Abnormal Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {abnormalResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No abnormal results
              </p>
            )}
            <div className="space-y-3">
              {abnormalResults.map((result) => (
                <div key={result.id} className="border rounded-lg p-3 bg-warning/5">
                  <p className="font-medium text-foreground">{result.testName}</p>
                  <p className="text-sm text-muted-foreground">
                    {result.patient.user.firstName} {result.patient.user.lastName}
                  </p>
                  {result.resultValue && (
                    <p className="text-sm font-medium text-warning">
                      Result: {result.resultValue} {result.units}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
