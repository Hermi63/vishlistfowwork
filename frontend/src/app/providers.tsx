"use client";

import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </AuthProvider>
  );
}
