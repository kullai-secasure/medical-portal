import Link from "next/link";
import { Users } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getDoctorPatients } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, calculateAge, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DoctorPatientsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) throw new Error("Doctor profile not found");

  const patients = await getDoctorPatients(doctor.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Patients"
        description="Patients you've treated, plus anyone referred to you by another doctor."
      />

      {patients.length === 0 && (
        <p className="text-sm text-muted-foreground">No patients yet.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => (
          <Link key={patient.id} href={`/doctor-patients/${patient.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 pt-6">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-primary/10 font-medium text-primary">
                    {initials(patient.user.firstName, patient.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {patient.user.firstName} {patient.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {calculateAge(patient.dateOfBirth)} yrs &middot; {titleCase(patient.gender)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="size-3.5" />
        {patients.length} patient{patients.length === 1 ? "" : "s"} with active access
      </div>
    </div>
  );
}
