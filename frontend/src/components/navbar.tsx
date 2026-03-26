"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/button";
import { Gift, LogOut, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  /* Отслеживаем скролл для эффекта компактного навбара */
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-compact" : "glass"
      }`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-6 transition-all duration-500 ${
          scrolled ? "h-14" : "h-16"
        }`}
      >
        {/* Логотип */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2.5 font-bold text-lg group"
        >
          <motion.div
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-purple-500 shadow-lg shadow-indigo-500/20"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Gift className="h-5 w-5 text-white" />
            {/* Мягкое свечение вокруг иконки */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent to-purple-500 opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-300" />
          </motion.div>
          <span className="tracking-tight text-zinc-100 group-hover:text-white transition-colors duration-200">
            WishList
          </span>
        </Link>

        {/* Навигация */}
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {user ? (
              <motion.div
                key="logged-in"
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Link href="/create-wishlist">
                  <Button size="sm" variant="gradient">
                    <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Новый список</span>
                  </Button>
                </Link>
                <span className="text-sm text-zinc-400 hidden sm:inline font-medium">
                  {user.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-zinc-500 hover:text-zinc-100"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="logged-out"
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    Войти
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="gradient">
                    <Sparkles className="h-3.5 w-3.5" /> Регистрация
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Градиентная линия под навбаром — видна при скролле */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.nav>
  );
}
