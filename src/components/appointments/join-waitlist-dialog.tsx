"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListPlus, Loader2 } from "lucide-react";
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
import { joinWaitlist } from "@/app/(dashboard)/appointments/actions";
import { titleCase } from "@/lib/format";
import type { Doctor, User } from "@prisma/client";

type DoctorWithUser = Doctor & { user: User };

function todayISODate() {
  return new Date().toISOString().split("T")[0];
}

export function JoinWaitlistDialog({ doctors }: { doctors: DoctorWithUser[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await joinWaitlist({ success: false }, formData);
      if (result.success) {
        toast.success("Added to waitlist. We'll auto-book you if a slot opens.");
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
        <Button variant="outline">
          <ListPlus className="size-4" />
          Join Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join Waitlist</DialogTitle>
            <DialogDescription>
              We&apos;ll automatically book you if a matching slot opens up within your preferred range.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doctorId">Doctor</Label>
              <Select name="doctorId" required>
                <SelectTrigger id="doctorId">
                  <SelectValue placeholder="Select a doctor" />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="preferredFrom">From</Label>
                <Input id="preferredFrom" name="preferredFrom" type="datetime-local" min={todayISODate()} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="preferredTo">To</Label>
                <Input id="preferredTo" name="preferredTo" type="datetime-local" min={todayISODate()} required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Reason for Visit</Label>
              <Textarea id="reason" name="reason" required minLength={3} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Join Waitlist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
