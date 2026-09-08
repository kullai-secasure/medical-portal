"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Share2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createReferral } from "@/app/(doctor)/doctor-referrals/actions";
import { titleCase } from "@/lib/format";

type PatientOption = { id: string; user: { firstName: string; lastName: string } };
type DoctorOption = { id: string; specialty: string; department: string; user: { firstName: string; lastName: string } };

export function CreateReferralDialog({
  patients,
  doctors,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createReferral({ success: false }, formData);
      if (result.success) {
        toast.success("Referral sent.");
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
        <Button>
          <Share2 className="size-4" />
          New Referral
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Refer Patient to Specialist</DialogTitle>
            <DialogDescription>
              The specialist will gain shared access to this patient&apos;s record while the referral is active.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="patientId">Patient</Label>
              <Select name="patientId" required>
                <SelectTrigger id="patientId">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.user.firstName} {p.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="specialistDoctorId">Refer To</Label>
              <Select name="specialistDoctorId" required>
                <SelectTrigger id="specialistDoctorId">
                  <SelectValue placeholder="Select a specialist" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.user.firstName} {d.user.lastName} &middot; {titleCase(d.department)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Reason for Referral</Label>
              <Textarea id="reason" name="reason" required minLength={3} rows={2} placeholder="e.g. Suspected arrhythmia, needs cardiology workup" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Send Referral
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
