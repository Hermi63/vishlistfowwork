"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GiftCard } from "@/components/gift-card";
import { useAuth } from "@/lib/auth-context";
import { api, getWsUrl } from "@/lib/api";
import {
  CalendarDays,
  Plus,
  Share2,
  X,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface WishlistData {
  id: number;
  title: string;
  description: string | null;
  event_date: string | null;
  slug: string;
  is_public: boolean;
  is_owner: boolean;
  owner: { id: number; name: string; email: string };
  items: GiftItem[];
}

interface GiftItem {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: number | null;
  status: string;
  created_at: string;
  reservation: { id: number; reserved_by_name: string } | null;
  contributions: { id: number; contributor_name: string; amount: number }[];
  total_contributed: number;
}

export default function WishlistPage() {
  const params = useParams();
  const slug = params.slug as string;
  useAuth();

  const [data, setData] = useState<WishlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.getWishlist(slug);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const ws = new WebSocket(getWsUrl(slug));
    wsRef.current = ws;
    ws.onmessage = () => { fetchData(); };
    ws.onerror = () => {};
    ws.onclose = () => {};
    return () => { ws.close(); };
  }, [slug, fetchData]);

  async function handleUrlBlur() {
    if (!newUrl.trim()) return;
    setPreviewLoading(true);
    try {
      const preview = await api.linkPreview(newUrl);
      if (preview.title && !newTitle) setNewTitle(preview.title);
      if (preview.image && !newImageUrl) setNewImageUrl(preview.image);
      if (preview.price && !newPrice) {
        const cleaned = preview.price.replace(/[^\d.,]/g, "").replace(",", ".");
        setNewPrice(cleaned);
      }
      if (preview.description && !newDescription) setNewDescription(preview.description);
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.addItem(slug, {
        title: newTitle,
        url: newUrl || undefined,
        price: newPrice ? parseFloat(newPrice) : undefined,
        description: newDescription || undefined,
        image_url: newImageUrl || undefined,
      });
      setNewTitle("");
      setNewUrl("");
      setNewPrice("");
      setNewDescription("");
      setNewImageUrl("");
      setShowAddForm(false);
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setAddLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert("Ссылка скопирована!");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
          <X className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-lg font-semibold">{error || "Вишлист не найден"}</p>
        <Link href="/">
          <Button variant="outline">На главную</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Шапка вишлиста */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">{data.title}</h1>
            <p className="mt-2 text-muted font-medium">
              от {data.owner.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Share2 className="h-4 w-4" /> Поделиться
            </Button>
            {data.is_owner && (
              <Link href={`/wishlist/${slug}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Редактировать
                </Button>
              </Link>
            )}
          </div>
        </div>

        {data.description && (
          <p className="mt-4 text-muted text-lg leading-relaxed max-w-2xl">{data.description}</p>
        )}

        {data.event_date && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
            <CalendarDays className="h-4 w-4" />
            {new Date(data.event_date).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      {/* Форма добавления (только для владельца) */}
      {data.is_owner && (
        <div className="mb-8">
          {!showAddForm ? (
            <Button variant="gradient" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4" /> Добавить подарок
            </Button>
          ) : (
            <Card className="animate-scale-in p-6 sm:p-8 shadow-medium">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-bold text-lg">Новый подарок</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-muted">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Ссылка на товар
                  </label>
                  <div className="relative">
                    <Input
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      onBlur={handleUrlBlur}
                      placeholder="https://..."
                    />
                    {previewLoading && (
                      <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-accent" />
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    Вставьте ссылку — данные заполнятся автоматически
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Название *</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Название подарка"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Цена, ₽</label>
                    <Input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Изображение</label>
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="URL картинки"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Описание</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Почему хочется именно это..."
                    className="flex min-h-[80px] w-full rounded-xl border-2 border-[var(--border)] bg-surface px-4 py-3 text-sm transition-all duration-200 placeholder:text-muted focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
                  />
                </div>
                <Button type="submit" variant="gradient" disabled={addLoading} className="w-full">
                  {addLoading ? "Добавление..." : "Добавить"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Сетка подарков */}
      {data.items.length === 0 ? (
        <Card className="flex flex-col items-center gap-5 p-16 text-center shadow-large">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/10 to-purple-500/10">
            <Sparkles className="h-10 w-10 text-accent animate-float" />
          </div>
          <h2 className="text-2xl font-bold">Подарков пока нет</h2>
          <p className="text-muted max-w-sm">
            {data.is_owner
              ? "Добавьте первый подарок в свой вишлист"
              : "Владелец ещё не добавил подарки"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item, i) => (
            <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <GiftCard
                item={item}
                slug={slug}
                isOwner={data.is_owner}
                onUpdate={fetchData}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
