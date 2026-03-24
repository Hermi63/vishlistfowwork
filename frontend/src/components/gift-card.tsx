"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { useToast } from "./ui/toast";
import { api } from "@/lib/api";
import {
  ExternalLink,
  Gift,
  Lock,
  Unlock,
  DollarSign,
  Trash2,
  Users,
  CheckCircle2,
} from "lucide-react";

interface GiftItem {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: number | null;
  status: string;
  reservation: { id: number; reserved_by_name: string } | null;
  contributions: { id: number; contributor_name: string; amount: number }[];
  total_contributed: number;
}

interface GiftCardProps {
  item: GiftItem;
  slug: string;
  isOwner: boolean;
  onUpdate: () => void;
}

export function GiftCard({ item, slug, isOwner, onUpdate }: GiftCardProps) {
  const [showReserve, setShowReserve] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, confirm } = useToast();

  const statusLabel: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
    available: {
      text: "Доступен",
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
      icon: <Gift className="h-3.5 w-3.5" />,
    },
    reserved: {
      text: "Зарезервирован",
      color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      icon: <Lock className="h-3.5 w-3.5" />,
    },
    crowdfunding: {
      text: "Сбор средств",
      color: "bg-accent/5 text-accent border border-accent/20",
      icon: <Users className="h-3.5 w-3.5" />,
    },
    funded: {
      text: "Собрано!",
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
  };

  const st = statusLabel[item.status] || statusLabel.available;

  async function handleReserve() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.reserveItem(slug, item.id, name);
      onUpdate();
      setShowReserve(false);
      setName("");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Ошибка резервирования", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnreserve() {
    setLoading(true);
    try {
      await api.unreserveItem(slug, item.id);
      onUpdate();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Ошибка снятия резерва", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleContribute() {
    if (!name.trim() || !amount) return;
    setLoading(true);
    try {
      await api.contribute(slug, item.id, name, parseFloat(amount));
      onUpdate();
      setShowContribute(false);
      setName("");
      setAmount("");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Ошибка вклада", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteItem() {
    const ok = await confirm("Удалить подарок?");
    if (!ok) return;
    try {
      await api.deleteItem(slug, item.id);
      onUpdate();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Ошибка удаления", "error");
    }
  }

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Изображение */}
      {item.image_url ? (
        <div className="relative h-52 bg-surface-hover overflow-hidden group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      ) : (
        <div className="flex h-36 items-center justify-center bg-gradient-to-br from-accent/5 to-purple-500/5">
          <Gift className="h-14 w-14 text-accent/20" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Заголовок и статус */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg leading-tight">{item.title}</h3>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${st.color}`}>
            {st.icon} {st.text}
          </span>
        </div>

        {item.description && (
          <p className="mb-3 text-sm text-muted line-clamp-2 leading-relaxed">{item.description}</p>
        )}

        {/* Цена */}
        {item.price !== null && (
          <p className="mb-3 text-2xl font-extrabold tracking-tight">
            {item.price.toLocaleString("ru-RU")} <span className="text-lg text-muted">₽</span>
          </p>
        )}

        {/* Прогресс сбора */}
        {(item.status === "crowdfunding" || item.status === "funded") && item.price && (
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-xs font-medium text-muted">
              <span>Собрано: {item.total_contributed.toLocaleString("ru-RU")} ₽</span>
              <span className="text-accent font-bold">{Math.round((item.total_contributed / item.price) * 100)}%</span>
            </div>
            <Progress value={item.total_contributed} max={item.price} />
          </div>
        )}

        {/* Список вкладов */}
        {!isOwner && item.contributions.length > 0 && (
          <div className="mb-4 rounded-xl bg-surface-hover p-3">
            <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">Вклады</p>
            {item.contributions.map((c) => (
              <div key={c.id} className="flex justify-between text-sm py-1">
                <span className="font-medium">{c.contributor_name}</span>
                <span className="font-bold text-accent">{c.amount.toLocaleString("ru-RU")} ₽</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-3">
          {/* Ссылка на товар */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Перейти к товару
            </a>
          )}

          {/* Действия гостя */}
          {!isOwner && item.status === "available" && (
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant="gradient" className="flex-1" onClick={() => setShowReserve(!showReserve)}>
                <Lock className="h-3.5 w-3.5" /> Зарезервировать
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowContribute(!showContribute)}
              >
                <DollarSign className="h-3.5 w-3.5" /> Скинуться
              </Button>
            </div>
          )}

          {!isOwner && item.status === "crowdfunding" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowContribute(!showContribute)}
              className="mt-1"
            >
              <DollarSign className="h-3.5 w-3.5" /> Добавить вклад
            </Button>
          )}

          {!isOwner && item.status === "reserved" && item.reservation && (
            <div className="flex items-center justify-between mt-1 rounded-xl bg-amber-50 dark:bg-amber-900/10 px-3 py-2">
              <span className="text-sm text-muted">
                Зарезервировал: <strong>{item.reservation.reserved_by_name}</strong>
              </span>
              <Button size="sm" variant="ghost" onClick={handleUnreserve} disabled={loading} className="text-muted hover:text-foreground">
                <Unlock className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Форма резервирования */}
          {showReserve && (
            <div className="flex gap-2 animate-slide-down">
              <Input
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button size="sm" variant="gradient" onClick={handleReserve} disabled={loading}>
                OK
              </Button>
            </div>
          )}

          {/* Форма вклада */}
          {showContribute && (
            <div className="space-y-2 animate-slide-down">
              <Input
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Сумма, ₽"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button size="sm" variant="gradient" onClick={handleContribute} disabled={loading}>
                  Внести
                </Button>
              </div>
            </div>
          )}

          {/* Удаление (для владельца) */}
          {isOwner && (
            <Button size="sm" variant="destructive" onClick={handleDeleteItem} className="mt-1">
              <Trash2 className="h-3.5 w-3.5" /> Удалить
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
