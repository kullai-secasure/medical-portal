"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const [firstName, lastName] = (session.user.name || "User").split(" ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials(firstName, lastName || "")}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm">{firstName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>
          <span className="text-sm">{session.user.email}</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <span className="text-xs text-muted-foreground">{session.user.role}</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <button onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
            <LogOut className="size-4 mr-2" />
            Sign Out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
