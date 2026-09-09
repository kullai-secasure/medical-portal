"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentPatient } from "@/lib/data";
import { logAccess } from "@/lib/audit";

export async function createShareLink(expiryHours: number) {
  const patient = await getCurrentPatient();

  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // A 256-bit random token, not the schema's cuid default — cuids are
  // shorter and semi-predictable (timestamp + counter based), which makes
  // them a realistic brute-force target for an unauthenticated, unthrottled
  // lookup endpoint (VenusHawk finding #2).
  const token = randomBytes(32).toString("base64url");

  const link = await prisma.shareLink.create({
    data: { patientId: patient.id, expiresAt, token },
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
