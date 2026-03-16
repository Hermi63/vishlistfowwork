"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/button";
import { LogOut, Plus } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center">
          <Image src="/logo.png" alt="Транспортные Технологии" height={44} width={160} style={{objectFit:"contain"}} priority />
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
