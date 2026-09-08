import { History } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getAuditLogs } from "@/lib/audit";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ resourceType?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") throw new Error("Admin access required");

  const { resourceType } = await searchParams;
  const logs = await getAuditLogs({ resourceType, limit: 200 });

  const resourceTypes = await prisma.auditLog.findMany({
    distinct: ["resourceType"],
    select: { resourceType: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Log"
        description="Every recorded access to a patient record — who viewed what, and when."
      />

      <div className="flex flex-wrap gap-2">
        <a href="/admin-audit-log">
          <Badge variant={!resourceType ? "default" : "outline"}>All</Badge>
        </a>
        {resourceTypes.map((r) => (
          <a key={r.resourceType} href={`/admin-audit-log?resourceType=${r.resourceType}`}>
            <Badge variant={resourceType === r.resourceType ? "default" : "outline"}>
              {r.resourceType}
            </Badge>
          </a>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">
                            {log.actorUser.firstName} {log.actorUser.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{titleCase(log.actorUser.role)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.resourceType}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.patient ? `${log.patient.user.firstName} ${log.patient.user.lastName}` : "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{log.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
