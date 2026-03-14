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
  Gift,
  Plus,
  Share2,
  X,
  Loader2,
  Pencil,
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

  // Add gift form
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

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket for realtime
  useEffect(() => {
    const ws = new WebSocket(getWsUrl(slug));
    wsRef.current = ws;

    ws.onmessage = () => {
      // On any event, refetch data
      fetchData();
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
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
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-red-600">{error || "Вишлист не найден"}</p>
        <Link href="/">
          <Button variant="outline">На главную</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{data.title}</h1>
            <p className="mt-1 text-neutral-500">
              от {data.owner.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1">
              <Share2 className="h-3.5 w-3.5" /> Поделиться
            </Button>
            {data.is_owner && (
              <Link href={`/wishlist/${slug}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Редактировать
                </Button>
              </Link>
            )}
          </div>
        </div>

        {data.description && (
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">{data.description}</p>
        )}

        {data.event_date && (
          <p className="mt-2 flex items-center gap-1 text-sm text-neutral-400">
            <CalendarDays className="h-4 w-4" />
            {new Date(data.event_date).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Add gift button (owner only) */}
      {data.is_owner && (
        <div className="mb-6">
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Добавить подарок
            </Button>
          ) : (
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Новый подарок</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
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
                      <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-neutral-400" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    Вставьте ссылку — данные заполнятся автоматически
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Название *</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Название подарка"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Цена, ₽</label>
                    <Input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Изображение</label>
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="URL картинки"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Описание</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Почему хочется именно это..."
                    className="flex min-h-[60px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <Button type="submit" disabled={addLoading} className="w-full">
                  {addLoading ? "Добавление..." : "Добавить"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Items grid */}
      {data.items.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-12 text-center">
          <Gift className="h-16 w-16 text-neutral-300" />
          <h2 className="text-xl font-semibold">Подарков пока нет</h2>
          <p className="text-neutral-500">
            {data.is_owner
              ? "Добавьте первый подарок в свой вишлист"
              : "Владелец ещё не добавил подарки"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <GiftCard
              key={item.id}
              item={item}
              slug={slug}
              isOwner={data.is_owner}
              onUpdate={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
