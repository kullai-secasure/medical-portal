"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentPatient } from "@/lib/data";
import { logAccess } from "@/lib/audit";

export async function createShareLink(expiryHours: number) {
  const patient = await getCurrentPatient();

  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  const link = await prisma.shareLink.create({
    data: { patientId: patient.id, expiresAt },
  });

  await logAccess(patient.userId, "CREATE", "ShareLink", `Created share link expiring in ${expiryHours}h`, {
    patientId: patient.id,
    resourceId: link.id,
  });

  revalidatePath("/profile");
  return link.token;
}

export async function revokeShareLink(shareLinkId: string) {
  const patient = await getCurrentPatient();

  await prisma.shareLink.updateMany({
    where: { id: shareLinkId, patientId: patient.id },
    data: { isRevoked: true },
  });

  revalidatePath("/profile");
}
