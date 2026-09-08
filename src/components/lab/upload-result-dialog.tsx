"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadLabResult } from "@/app/(lab)/lab-orders/actions";

export function UploadResultDialog({ labResultId, testName }: { labResultId: string; testName: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await uploadLabResult({ success: false }, formData);
      if (result.success) {
        toast.success("Result uploaded.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="size-3.5" />
          Upload Result
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="labResultId" value={labResultId} />
          <DialogHeader>
            <DialogTitle>Upload Result: {testName}</DialogTitle>
            <DialogDescription>
              Attach the report and enter the result value. The ordering doctor will review before it&apos;s released to the patient.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="resultValue">Result Value</Label>
              <Input id="resultValue" name="resultValue" required placeholder="e.g. 5.4 or Negative" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="normalRange">Normal Range</Label>
                <Input id="normalRange" name="normalRange" placeholder="e.g. 4.0 - 6.0" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="units">Units</Label>
                <Input id="units" name="units" placeholder="e.g. mg/dL" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Lab Notes (optional)</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">Attachment (PDF/image, optional)</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="isAbnormal" value="true" />
              Flag as abnormal
            </label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Submit Result
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
