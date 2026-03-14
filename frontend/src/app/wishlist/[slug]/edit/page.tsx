"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

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
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-lg p-8">
        <h1 className="mb-6 text-2xl font-bold">Редактировать вишлист</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Название</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Дата события</label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={saving}>
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
