"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Loader2, Pencil } from "lucide-react";

export default function EditWishlistPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getWishlist(slug)
      .then((data) => {
        if (!data.is_owner) {
          router.push(`/wishlist/${slug}`);
          return;
        }
        setTitle(data.title);
        setDescription(data.description || "");
        setEventDate(data.event_date ? data.event_date.split("T")[0] : "");
      })
      .catch(() => setError("Не удалось загрузить"))
      .finally(() => setLoading(false));
  }, [slug, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.updateWishlist(slug, {
        title,
        description: description || null,
        event_date: eventDate || null,
      });
      router.push(`/wishlist/${slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex justify-center px-4">
      <Card className="animate-scale-in w-full max-w-lg p-8 sm:p-10 shadow-large">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-medium">
            <Pencil className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Редактировать</h1>
          <p className="mt-1 text-sm text-muted">Измените данные вишлиста</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Название</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[100px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 transition-all duration-200 placeholder:text-zinc-500 focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 resize-none"
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
          <div className="flex gap-3">
            <Button type="submit" variant="gradient" className="flex-1" disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/wishlist/${slug}`)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
