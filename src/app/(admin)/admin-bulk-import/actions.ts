"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

async function getCurrentAdminOrThrow() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") throw new Error("Admin access required");
  return { session, user };
}

const rowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  dateOfBirth: z.string().min(1),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]).optional(),
});

export type ImportResult = {
  success: boolean;
  error?: string;
  totalRows?: number;
  successCount?: number;
  errorCount?: number;
  errors?: { row: number; message: string }[];
};

export async function bulkImportPatients(
  _prevState: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const { session } = await getCurrentAdminOrThrow();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Please select a CSV file." };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    return { success: false, error: `CSV parse error: ${parsed.errors[0].message}` };
  }

  const rows = parsed.data;
  const errors: { row: number; message: string }[] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = rowSchema.safeParse({
      firstName: row.firstName?.trim(),
      lastName: row.lastName?.trim(),
      email: row.email?.trim().toLowerCase(),
      dateOfBirth: row.dateOfBirth?.trim(),
      phone: row.phone?.trim() || undefined,
      gender: (row.gender?.trim().toUpperCase() as "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED") || undefined,
    });

    if (!result.success) {
      errors.push({ row: i + 2, message: result.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }

    const dob = new Date(result.data.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      errors.push({ row: i + 2, message: "Invalid date of birth" });
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { email: result.data.email } });
    if (existing) {
      errors.push({ row: i + 2, message: `Email already exists: ${result.data.email}` });
      continue;
    }

    try {
      const tempPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await hashPassword(tempPassword);

      await prisma.user.create({
        data: {
          email: result.data.email,
          passwordHash,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          role: "PATIENT",
          patient: {
            create: {
              dateOfBirth: dob,
              phone: result.data.phone,
              gender: result.data.gender ?? "UNDISCLOSED",
            },
          },
        },
      });
      successCount++;
    } catch (e) {
      errors.push({ row: i + 2, message: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  await prisma.importBatch.create({
    data: {
      importedById: session.user.id,
      fileName: file.name,
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    },
  });

  revalidatePath("/admin-bulk-import");

  return {
    success: true,
    totalRows: rows.length,
    successCount,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
  };
}
