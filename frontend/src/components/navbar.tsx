"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/button";
import { Gift, LogOut, Plus } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 glass animate-slide-down">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2.5 font-bold text-lg group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-purple-500 shadow-soft transition-transform duration-200 group-hover:scale-110">
            <Gift className="h-5 w-5 text-white" />
          </div>
          <span className="tracking-tight">WishList</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/create-wishlist">
                <Button size="sm" variant="gradient">
                  <Plus className="h-4 w-4" /> Новый список
                </Button>
              </Link>
              <span className="text-sm text-muted hidden sm:inline font-medium">
                {user.name}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} className="text-muted hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Войти</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" variant="gradient">Регистрация</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
