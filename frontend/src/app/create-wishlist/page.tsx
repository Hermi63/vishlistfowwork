"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Gift } from "lucide-react";

export default function CreateWishlistPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.createWishlist({
        title,
        description: description || undefined,
        event_date: eventDate || undefined,
      });
      router.push(`/wishlist/${res.slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center px-4">
      <Card className="animate-scale-in w-full max-w-lg p-8 sm:p-10 shadow-large">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-purple-500 shadow-medium">
            <Gift className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Новый вишлист</h1>
          <p className="mt-1 text-sm text-muted">Заполните информацию о событии</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Название *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="День рождения, Новый год..."
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажите что за повод..."
              className="flex min-h-[100px] w-full rounded-xl border-2 border-[var(--border)] bg-surface px-4 py-3 text-sm transition-all duration-200 placeholder:text-muted focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Дата события</label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400 animate-slide-down">
              {error}
            </div>
          )}
          <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
            {loading ? "Создание..." : "Создать вишлист"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
