import Link from "next/link";
import { Search, User, Stethoscope, CalendarClock, FileText } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  type?: string;
  department?: string;
  status?: string;
  from?: string;
  to?: string;
};

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") throw new Error("Admin access required");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type ?? "all";
  const department = params.department;
  const status = params.status;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  const hasQuery = q.length > 0 || department || status || from || to;

  const [patients, doctors, appointments, records] = await Promise.all([
    type === "all" || type === "patients"
      ? prisma.patient.findMany({
          where: q
            ? { user: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } }
            : undefined,
          include: { user: true },
          take: 20,
        })
      : [],
    type === "all" || type === "doctors"
      ? prisma.doctor.findMany({
          where: {
            department: department ? (department as never) : undefined,
            user: q
              ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
              : undefined,
          },
          include: { user: true },
          take: 20,
        })
      : [],
    type === "all" || type === "appointments"
      ? prisma.appointment.findMany({
          where: {
            status: status ? (status as never) : undefined,
            scheduledAt: from || to ? { gte: from, lte: to } : undefined,
          },
          include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
          orderBy: { scheduledAt: "desc" },
          take: 20,
        })
      : [],
    type === "all" || type === "records"
      ? prisma.medicalRecord.findMany({
          where: {
            visitDate: from || to ? { gte: from, lte: to } : undefined,
            diagnosis: q ? { contains: q, mode: "insensitive" } : undefined,
          },
          include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
          orderBy: { visitDate: "desc" },
          take: 20,
        })
      : [],
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Global Search"
        description="Search across patients, doctors, appointments, and medical records."
      />

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col gap-4" method="get">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input name="q" defaultValue={q} placeholder="Search by name, email, or diagnosis..." className="pl-9" />
              </div>
              <Select name="type" defaultValue={type}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="patients">Patients</SelectItem>
                  <SelectItem value="doctors">Doctors</SelectItem>
                  <SelectItem value="appointments">Appointments</SelectItem>
                  <SelectItem value="records">Medical Records</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Select name="department" defaultValue={department}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARDIOLOGY">Cardiology</SelectItem>
                  <SelectItem value="DERMATOLOGY">Dermatology</SelectItem>
                  <SelectItem value="ENDOCRINOLOGY">Endocrinology</SelectItem>
                  <SelectItem value="FAMILY_MEDICINE">Family Medicine</SelectItem>
                  <SelectItem value="NEUROLOGY">Neurology</SelectItem>
                  <SelectItem value="ORTHOPEDICS">Orthopedics</SelectItem>
                </SelectContent>
              </Select>
              <Select name="status" defaultValue={status}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input name="from" type="date" defaultValue={params.from} />
              <Input name="to" type="date" defaultValue={params.to} />
            </div>
            <Button type="submit" className="w-fit">
              <Search className="size-4" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {!hasQuery && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Enter a search term or filter to see results.
        </p>
      )}

      {hasQuery && (
        <div className="flex flex-col gap-6">
          {(type === "all" || type === "patients") && patients.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <User className="size-4" /> Patients ({patients.length})
              </h2>
              <div className="flex flex-col gap-2">
                {patients.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <p className="text-sm text-foreground">{p.user.firstName} {p.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{p.user.email}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {(type === "all" || type === "doctors") && doctors.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Stethoscope className="size-4" /> Doctors ({doctors.length})
              </h2>
              <div className="flex flex-col gap-2">
                {doctors.map((d) => (
                  <Card key={d.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <p className="text-sm text-foreground">Dr. {d.user.firstName} {d.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{titleCase(d.department)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {(type === "all" || type === "appointments") && appointments.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <CalendarClock className="size-4" /> Appointments ({appointments.length})
              </h2>
              <div className="flex flex-col gap-2">
                {appointments.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-foreground">
                          {a.patient.user.firstName} {a.patient.user.lastName} with Dr. {a.doctor.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(a.scheduledAt)}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {(type === "all" || type === "records") && records.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <FileText className="size-4" /> Medical Records ({records.length})
              </h2>
              <div className="flex flex-col gap-2">
                {records.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-foreground">{r.diagnosis}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.patient.user.firstName} {r.patient.user.lastName} &middot; Dr. {r.doctor.user.lastName}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(r.visitDate)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {patients.length === 0 && doctors.length === 0 && appointments.length === 0 && records.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No results found.</p>
          )}
        </div>
      )}
    </div>
  );
}
