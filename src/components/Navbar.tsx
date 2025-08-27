"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { ModeToggle } from "./theme-toggle";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Type } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [selectedFont, setSelectedFont] = useState("default");
  
  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/competitions", label: "Competitions" },
    { href: "/teams", label: "Teams" },
    { href: "/schools", label: "Schools" },
  ];

  const fonts = [
    { value: "default", label: "Default", family: "inherit" },
    { value: "noto-nastaliq", label: "Noto Nastaliq Urdu", family: "'Noto Nastaliq Urdu', serif" },
    { value: "gulzar", label: "Gulzar", family: "'Gulzar', serif" },
  ];

  // Load font preference from localStorage on mount
  useEffect(() => {
    const savedFont = localStorage.getItem("quiz-font-preference");
    if (savedFont) {
      setSelectedFont(savedFont);
      applyFontToDocument(savedFont);
    }
  }, []);

  const applyFontToDocument = (fontValue: string) => {
    const font = fonts.find(f => f.value === fontValue);
    if (font) {
      document.documentElement.style.setProperty('--quiz-font-family', font.family);
      console.log('Font applied:', font.family); // Debug log
    }
  };

  const handleFontChange = (value: string) => {
    setSelectedFont(value);
    localStorage.setItem("quiz-font-preference", value);
    applyFontToDocument(value);
  };
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-auto items-center justify-between px-4">
        <Link href="/" className="font-semibold"><Image src="/logo.png" alt="quiz competition" width={1000} height={1000} className="w-40"/></Link>
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
          
          {/* Font Selection */}
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <Select value={selectedFont} onValueChange={handleFontChange}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {fonts.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: font.family }}>
                      {font.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="h-6 w-0.5 bg-border" />
          
          <ModeToggle/>
        </nav>
      </div>
    </header>
  );
}
