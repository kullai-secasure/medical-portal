import { Stethoscope, FlaskConical, Activity, FileText as FileIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getCurrentPatient, getMedicalRecords, getReleasedLabResults } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function RecordsPage() {
  const patient = await getCurrentPatient();
  const [records, labResults] = await Promise.all([
    getMedicalRecords(patient.id),
    getReleasedLabResults(patient.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Medical Records"
        description="Your visit history, vitals, and lab results in one timeline."
      />

      <Tabs defaultValue="visits">
        <TabsList>
          <TabsTrigger value="visits">
            <Stethoscope className="size-4" />
            Visit History
          </TabsTrigger>
          <TabsTrigger value="labs">
            <FlaskConical className="size-4" />
            Lab Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="flex flex-col gap-4">
          {records.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No medical records yet.
            </p>
          )}
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium text-foreground">
                      {record.diagnosis}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dr. {record.doctor.user.firstName} {record.doctor.user.lastName}{" "}
                      &middot; {formatDate(record.visitDate)}
                    </p>
                  </div>
                </div>

                {record.treatment && (
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Treatment: </span>
                    {record.treatment}
                  </p>
                )}
                {record.notes && (
                  <p className="text-sm text-muted-foreground">
                    {record.notes}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4">
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3 text-center">
                    <Activity className="size-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      {record.bloodPressure ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Blood Pressure
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {record.heartRateBpm ? `${record.heartRateBpm} bpm` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Heart Rate</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {record.temperatureC ? `${record.temperatureC}°C` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Temperature
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {record.weightKg ? `${record.weightKg} kg` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Weight</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="labs" className="flex flex-col gap-4">
          {labResults.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No released lab results yet. Results appear here once your doctor has reviewed them.
              </CardContent>
            </Card>
          )}
          {labResults.map((lab) => (
            <Card key={lab.id}>
              <CardContent className="flex flex-col gap-2 pt-6">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                  <p className="font-medium text-foreground">{lab.testName}</p>
                  <StatusBadge status={lab.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ordered by Dr. {lab.doctor.user.lastName} &middot; {formatDate(lab.orderedDate)}
                </p>
                <p className="text-sm text-foreground">
                  Result: <span className="font-medium">{lab.resultValue} {lab.units}</span>
                  {lab.normalRange && (
                    <span className="text-muted-foreground"> (normal range: {lab.normalRange})</span>
                  )}
                </p>
                {lab.doctorNotes && (
                  <p className="rounded-md bg-primary/5 px-3 py-2 text-sm text-foreground">
                    <span className="font-medium">Doctor&apos;s note: </span>
                    {lab.doctorNotes}
                  </p>
                )}
                {lab.fileUrl && (
                  <a
                    href={lab.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit items-center gap-1.5 text-sm text-primary underline underline-offset-2"
                  >
                    <FileIcon className="size-3.5" />
                    View report
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
