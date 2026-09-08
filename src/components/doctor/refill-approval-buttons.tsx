"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
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
import { respondToRefillRequest } from "@/app/(doctor)/doctor-prescriptions/actions";

export function RefillApprovalButtons({ refillRequestId }: { refillRequestId: string }) {
  const [denyOpen, setDenyOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function approve() {
    startTransition(async () => {
      try {
        await respondToRefillRequest(refillRequestId, true);
        toast.success("Refill approved.");
        router.refresh();
      } catch {
        toast.error("Could not approve refill.");
      }
    });
  }

  function handleDeny(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reason = formData.get("reason") as string;

    startTransition(async () => {
      try {
        await respondToRefillRequest(refillRequestId, false, reason);
        toast.success("Refill denied.");
        setDenyOpen(false);
        router.refresh();
      } catch {
        toast.error("Could not deny refill.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={approve} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Approve
      </Button>
      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={isPending}>
            <X className="size-4" />
            Deny
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleDeny}>
            <DialogHeader>
              <DialogTitle>Deny Refill Request</DialogTitle>
              <DialogDescription>The patient will be notified with your reason.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" name="reason" required rows={2} className="mt-2" placeholder="e.g. Needs an office visit first" />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={isPending} className="w-full sm:w-auto">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Deny Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
