"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { releaseLabResult } from "@/app/(doctor)/doctor-lab-review/actions";

export function ReleaseResultDialog({ labResultId, testName }: { labResultId: string; testName: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await releaseLabResult({ success: false }, formData);
      if (result.success) {
        toast.success("Result released to patient.");
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
          <Send className="size-3.5" />
          Review &amp; Release
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="labResultId" value={labResultId} />
          <DialogHeader>
            <DialogTitle>Release: {testName}</DialogTitle>
            <DialogDescription>
              Add clinical notes for the patient, then release the result so they can view it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="doctorNotes">Notes for Patient (optional)</Label>
            <Textarea
              id="doctorNotes"
              name="doctorNotes"
              rows={3}
              className="mt-2"
              placeholder="e.g. Your levels look great, no action needed."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Release to Patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
