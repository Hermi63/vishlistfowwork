"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // На главной странице контент идёт без ограничений (full-width для 3D hero)
  const isHome = pathname === "/";

  return (
    <AuthProvider>
      <Navbar />
      {isHome ? (
        <main>{children}</main>
      ) : (
        <main className="mx-auto max-w-5xl px-4 py-8 pt-24">{children}</main>
      )}
    </AuthProvider>
  );
}
