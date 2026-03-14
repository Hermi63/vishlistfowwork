"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/button";
import { Gift, LogOut, Plus } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-lg">
          <Gift className="h-6 w-6 text-blue-600" />
          <span>WishList</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/create-wishlist">
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Новый список
                </Button>
              </Link>
              <span className="text-sm text-neutral-500 hidden sm:inline">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">Войти</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Регистрация</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
