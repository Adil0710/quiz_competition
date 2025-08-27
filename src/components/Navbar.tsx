"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { ModeToggle } from "./theme-toggle";

export default function Navbar() {
  const pathname = usePathname();
  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/competitions", label: "Competitions" },
    { href: "/teams", label: "Teams" },
    { href: "/schools", label: "Schools" },
  ];
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-semibold">Quiz Admin</Link>
        <nav className="flex items-center gap-5 text-sm">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "transition-colors hover:text-foreground/80 font-medium ",
                pathname === i.href ? "text-foreground font-bold" : "text-foreground/60"
              )}
            >
              {i.label}
            </Link>
          ))}
            <div className="h-6 w-0.5 bg-border" />
          
          <ModeToggle/>
        </nav>
      </div>
    </header>
  );
}
