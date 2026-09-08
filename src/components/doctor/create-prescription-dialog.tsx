"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPrescription } from "@/app/(doctor)/doctor-prescriptions/actions";

type PatientOption = { id: string; user: { firstName: string; lastName: string } };

export function CreatePrescriptionDialog({ patients }: { patients: PatientOption[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPrescription({ success: false }, formData);
      if (result.success) {
        toast.success("Prescription created.");
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
          <Plus className="size-4" />
          New Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Prescription</DialogTitle>
            <DialogDescription>Prescribe a new medication for a patient.</DialogDescription>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="medicationName">Medication</Label>
                <Input id="medicationName" name="medicationName" required placeholder="e.g. Amoxicillin" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dosage">Dosage</Label>
                <Input id="dosage" name="dosage" required placeholder="e.g. 500mg" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Input id="frequency" name="frequency" required placeholder="e.g. Twice daily" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="instructions">Instructions (optional)</Label>
              <Textarea id="instructions" name="instructions" rows={2} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="maxRefills">Refills Allowed</Label>
              <Input id="maxRefills" name="maxRefills" type="number" min={0} max={12} defaultValue={0} required />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Create Prescription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
