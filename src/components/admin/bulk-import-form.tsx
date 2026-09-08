"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { bulkImportPatients, type ImportResult } from "@/app/(admin)/admin-bulk-import/actions";

export function BulkImportForm() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await bulkImportPatients({ success: false }, formData);
      setResult(res);
      if (res.success) {
        toast.success(`Imported ${res.successCount} of ${res.totalRows} patients.`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Import failed.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">CSV File</Label>
              <Input id="file" name="file" type="file" accept=".csv" required />
              <p className="text-xs text-muted-foreground">
                Required columns: firstName, lastName, email, dateOfBirth (YYYY-MM-DD). Optional: phone, gender.
              </p>
            </div>
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              <Upload className="size-4" />
              Import Patients
            </Button>
          </form>
        </CardContent>
      </Card>

      {result?.success && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-4" />
              <p className="text-sm font-medium">
                {result.successCount} of {result.totalRows} patients imported successfully
              </p>
            </div>
            {result.errorCount ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-4" />
                  <p className="text-sm font-medium">{result.errorCount} rows had errors</p>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {result.errors?.map((e, i) => (
                    <div key={i} className="border-b px-3 py-2 text-xs last:border-0">
                      <span className="font-medium">Row {e.row}:</span> {e.message}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
