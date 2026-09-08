import { Pill, RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefillRequestButton } from "@/components/prescriptions/refill-request-button";
import { getCurrentPatient, getPrescriptions } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function PrescriptionsPage() {
  const patient = await getCurrentPatient();
  const prescriptions = await getPrescriptions(patient.id);

  const active = prescriptions.filter((p) => p.status === "ACTIVE");
  const inactive = prescriptions.filter((p) => p.status !== "ACTIVE");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Prescriptions"
        description="Track your active medications and prescription history."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active
        </h2>
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active prescriptions.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {active.map((rx) => (
            <Card key={rx.id}>
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Pill className="size-4" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        {rx.medicationName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {rx.dosage} &middot; {rx.frequency}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={rx.status} />
                </div>
                {rx.instructions && (
                  <p className="text-sm text-muted-foreground">
                    {rx.instructions}
                  </p>
                )}
                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">
                    Prescribed by Dr. {rx.doctor.user.lastName}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <RefreshCcw className="size-3.5" />
                    {rx.refillsRemaining} refill
                    {rx.refillsRemaining === 1 ? "" : "s"} left
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Started {formatDate(rx.startDate)}
                </p>

                {rx.refillRequests[0]?.status === "PENDING" && (
                  <p className="rounded-md bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
                    Refill request pending doctor approval
                  </p>
                )}
                {rx.refillRequests[0]?.status === "DENIED" && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    Last refill request denied
                    {rx.refillRequests[0].denialReason ? `: ${rx.refillRequests[0].denialReason}` : "."}
                  </p>
                )}
                {(!rx.refillRequests[0] || rx.refillRequests[0].status !== "PENDING") && (
                  <RefillRequestButton prescriptionId={rx.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          History
        </h2>
        {inactive.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No past prescriptions.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {inactive.map((rx) => (
            <Card key={rx.id} className="opacity-90">
              <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Pill className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      {rx.medicationName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {rx.dosage} &middot; {rx.frequency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(rx.startDate)}
                      {rx.endDate ? ` – ${formatDate(rx.endDate)}` : ""}{" "}
                      &middot; Dr. {rx.doctor.user.lastName}
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
