import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <Logo />
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} MedPortal Health, Inc. This is a
          demo application — not for real medical use.
        </p>
      </div>
    </footer>
  );
}
