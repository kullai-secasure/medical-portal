import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { initials } from "@/lib/format";
import type { User } from "@prisma/client";

function UserSummary({ user }: { user: User }) {
  const content = (
    <>
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
          {initials(user.firstName, user.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </>
  );

  if (user.role === "PATIENT") {
    return (
      <Link
        href="/profile"
        className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 rounded-lg px-2 py-2">{content}</div>;
}

export function Sidebar({ user }: { user: User | null }) {
  if (!user) return null;

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <SidebarNav role={user.role} />
      </div>
      <div className="border-t p-4">
        <UserSummary user={user} />
      </div>
    </aside>
  );
}
