"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Gift, Plus, X, Loader2 } from "lucide-react";

interface DraftItem {
  id: string;
  title: string;
  url?: string;
  price?: string;
  description?: string;
  image_url?: string;
}

export default function CreateWishlistPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Подарки, добавляемые на этапе создания
  const [items, setItems] = useState<DraftItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  function addItem() {
    if (!itemTitle.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: itemTitle,
        url: itemUrl || undefined,
        price: itemPrice || undefined,
      },
    ]);
    setItemTitle("");
    setItemUrl("");
    setItemPrice("");
    setShowItemForm(false);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleUrlBlur() {
    if (!itemUrl.trim()) return;
    setPreviewLoading(true);
    try {
      const preview = await api.linkPreview(itemUrl);
      if (preview.title && !itemTitle) setItemTitle(preview.title);
      if (preview.price && !itemPrice) {
        const cleaned = preview.price.replace(/[^\d.,]/g, "").replace(",", ".");
        setItemPrice(cleaned);
      }
    } catch {
      // игнорируем
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (user) {
      // Залогинен — создаём через API
      try {
        const res = await api.createWishlist({
          title,
          description: description || undefined,
          event_date: eventDate || undefined,
        });
        // Добавляем подарки
        for (const item of items) {
          await api.addItem(res.slug, {
            title: item.title,
            url: item.url,
            price: item.price ? parseFloat(item.price) : undefined,
          });
        }
        router.push(`/wishlist/${res.slug}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка");
        setLoading(false);
      }
    } else {
      // Не залогинен — сохраняем черновик в localStorage и отправляем на регистрацию
      const draft = {
        title,
        description: description || undefined,
        event_date: eventDate || undefined,
        items,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem("wishlist_draft", JSON.stringify(draft));
      router.push("/register?redirect=create-wishlist");
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
          <p className="mt-1 text-sm text-muted">
            {user ? "Заполните информацию о событии" : "Регистрация не нужна — просто заполните форму"}
          </p>
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

          {/* Список добавленных подарков */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Подарки ({items.length})</label>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-surface-hover p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.price && (
                      <p className="text-xs text-muted">{item.price} ₽</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="ml-2 text-muted hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Форма добавления подарка */}
          {showItemForm ? (
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Добавить подарок</span>
                <button type="button" onClick={() => setShowItemForm(false)} className="text-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Input
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="Ссылка на товар (необязательно)"
                />
                {previewLoading && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-accent" />
                )}
              </div>
              <Input
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Название подарка *"
              />
              <Input
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                placeholder="Цена, ₽"
                type="number"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={!itemTitle.trim()}
                className="w-full"
              >
                Добавить в список
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowItemForm(true)}
              className="flex items-center gap-2 text-sm text-accent hover:text-accent-dark transition-colors font-medium"
            >
              <Plus className="h-4 w-4" /> Добавить подарки сразу
            </button>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400 animate-slide-down">
              {error}
            </div>
          )}

          <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
            {loading ? "Создание..." : user ? "Создать вишлист" : "Создать и поделиться"}
          </Button>

          {!user && (
            <p className="text-xs text-center text-muted">
              Для сохранения и отправки ссылки понадобится быстрая регистрация
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
