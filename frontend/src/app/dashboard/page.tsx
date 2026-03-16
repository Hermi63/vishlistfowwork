"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { CalendarDays, Gift, Plus, Share2, Trash2, Sparkles } from "lucide-react";

interface WishlistSummary {
  id: number;
  title: string;
  description: string | null;
  event_date: string | null;
  slug: string;
  is_public: boolean;
  item_count: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [wishlists, setWishlists] = useState<WishlistSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      api.getMyWishlists().then(setWishlists).finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  async function handleDelete(slug: string) {
    if (!confirm("Удалить вишлист и все подарки?")) return;
    try {
      await api.deleteWishlist(slug);
      setWishlists((prev) => prev.filter((w) => w.slug !== slug));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/wishlist/${slug}`;
    navigator.clipboard.writeText(url);
    alert("Ссылка скопирована!");
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Шапка */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Добро пожаловать, {user?.name}</p>
          <h1 className="text-4xl font-extrabold tracking-tight">Мои вишлисты</h1>
        </div>
        <Link href="/create-wishlist">
          <Button variant="gradient">
            <Plus className="h-4 w-4" /> Создать
          </Button>
        </Link>
      </div>

      {wishlists.length === 0 ? (
        <Card className="flex flex-col items-center gap-5 p-16 text-center shadow-large">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/10 to-purple-500/10">
            <Sparkles className="h-10 w-10 text-accent animate-float" />
          </div>
          <h2 className="text-2xl font-bold">У вас пока нет вишлистов</h2>
          <p className="text-muted max-w-sm">
            Создайте первый список желаний и поделитесь им с друзьями
          </p>
          <Link href="/create-wishlist">
            <Button variant="gradient" size="lg">
              <Plus className="h-5 w-5" /> Создать вишлист
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wl, i) => (
            <Card
              key={wl.id}
              className="animate-fade-in-up flex flex-col p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Link href={`/wishlist/${wl.slug}`} className="mb-2 block group">
                <h3 className="text-lg font-bold group-hover:text-accent transition-colors duration-200">
                  {wl.title}
                </h3>
              </Link>
              {wl.description && (
                <p className="mb-3 text-sm text-muted line-clamp-2">
                  {wl.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-3 text-sm text-muted">
                  <span className="flex items-center gap-1.5 rounded-full bg-accent/5 px-2.5 py-1">
                    <Gift className="h-3.5 w-3.5 text-accent" /> {wl.item_count}
                  </span>
                  {wl.event_date && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(wl.event_date).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyLink(wl.slug)}
                    title="Копировать ссылку"
                    className="text-muted hover:text-accent"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(wl.slug)}
                    title="Удалить"
                    className="text-muted hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
