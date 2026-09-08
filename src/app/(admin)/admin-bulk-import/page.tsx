import { History } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BulkImportForm } from "@/components/admin/bulk-import-form";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminBulkImportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") throw new Error("Admin access required");

  const batches = await prisma.importBatch.findMany({
    include: { importedBy: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk Import Patients"
        description="Upload a CSV to create multiple patient accounts at once."
      />

      <BulkImportForm />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <History className="size-4" />
          Import History
        </h2>
        {batches.length === 0 && <p className="text-sm text-muted-foreground">No imports yet.</p>}
        <div className="flex flex-col gap-3">
          {batches.map((batch) => (
            <Card key={batch.id}>
              <CardContent className="flex flex-col gap-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{batch.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {batch.successCount}/{batch.totalRows} imported &middot; by {batch.importedBy.firstName}{" "}
                    {batch.importedBy.lastName}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(batch.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
