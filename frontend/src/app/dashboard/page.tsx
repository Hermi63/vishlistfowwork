"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { CalendarDays, Gift, Plus, Share2, Trash2 } from "lucide-react";

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
    return <div className="flex justify-center py-20 text-neutral-400">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Мои вишлисты</h1>
        <Link href="/create-wishlist">
          <Button className="gap-1">
            <Plus className="h-4 w-4" /> Создать
          </Button>
        </Link>
      </div>

      {wishlists.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-12 text-center">
          <Gift className="h-16 w-16 text-neutral-300" />
          <h2 className="text-xl font-semibold">У вас пока нет вишлистов</h2>
          <p className="text-neutral-500">
            Создайте первый список желаний и поделитесь им с друзьями
          </p>
          <Link href="/create-wishlist">
            <Button>Создать вишлист</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wl) => (
            <Card key={wl.id} className="flex flex-col p-5">
              <Link href={`/wishlist/${wl.slug}`} className="mb-2 block">
                <h3 className="text-lg font-semibold hover:text-blue-600 transition-colors">
                  {wl.title}
                </h3>
              </Link>
              {wl.description && (
                <p className="mb-3 text-sm text-neutral-500 line-clamp-2">
                  {wl.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3 text-sm text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5" /> {wl.item_count}
                  </span>
                  {wl.event_date && (
                    <span className="flex items-center gap-1">
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
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(wl.slug)}
                    title="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
