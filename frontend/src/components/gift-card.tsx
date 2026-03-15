"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
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

  const statusLabel: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
    available: {
      text: "Доступен",
      color: "bg-green-100 text-green-800",
      icon: <Gift className="h-3.5 w-3.5" />,
    },
    reserved: {
      text: "Зарезервирован",
      color: "bg-amber-100 text-amber-800",
      icon: <Lock className="h-3.5 w-3.5" />,
    },
    crowdfunding: {
      text: "Сбор средств",
      color: "bg-blue-100 text-blue-800",
      icon: <Users className="h-3.5 w-3.5" />,
    },
    funded: {
      text: "Собрано!",
      color: "bg-green-100 text-green-800",
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
      alert(e instanceof Error ? e.message : "Error");
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
      alert(e instanceof Error ? e.message : "Error");
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
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteItem() {
    if (!confirm("Удалить подарок?")) return;
    try {
      await api.deleteItem(slug, item.id);
      onUpdate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <Card className="overflow-hidden flex flex-col">
      {item.image_url && (
        <div className="relative h-48 bg-neutral-100 dark:bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      {!item.image_url && (
        <div className="flex h-32 items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-neutral-800 dark:to-neutral-900">
          <Gift className="h-12 w-12 text-neutral-300" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight">{item.title}</h3>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${st.color}`}>
            {st.icon} {st.text}
          </span>
        </div>

        {item.description && (
          <p className="mb-3 text-sm text-neutral-500 line-clamp-2">{item.description}</p>
        )}

        {item.price !== null && (
          <p className="mb-2 text-xl font-bold text-neutral-900 dark:text-white">
            {item.price.toLocaleString("ru-RU")} ₽
          </p>
        )}

        {(item.status === "crowdfunding" || item.status === "funded") && item.price && (
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs text-neutral-500">
              <span>Собрано: {item.total_contributed.toLocaleString("ru-RU")} ₽</span>
              <span>{Math.round((item.total_contributed / item.price) * 100)}%</span>
            </div>
            <Progress value={item.total_contributed} max={item.price} />
          </div>
        )}

        {/* Contributions list (visible to non-owners) */}
        {!isOwner && item.contributions.length > 0 && (
          <div className="mb-3 rounded-lg bg-neutral-50 p-2 dark:bg-neutral-900">
            <p className="mb-1 text-xs font-medium text-neutral-500">Вклады:</p>
            {item.contributions.map((c) => (
              <div key={c.id} className="flex justify-between text-sm">
                <span>{c.contributor_name}</span>
                <span className="font-medium">{c.amount.toLocaleString("ru-RU")} ₽</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ссылка на товар
            </a>
          )}

          {/* Non-owner actions */}
          {!isOwner && item.status === "available" && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => setShowReserve(!showReserve)}>
                <Lock className="mr-1 h-3.5 w-3.5" /> Зарезервировать
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowContribute(!showContribute)}
              >
                <DollarSign className="mr-1 h-3.5 w-3.5" /> Скинуться
              </Button>
            </div>
          )}

          {!isOwner && item.status === "crowdfunding" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowContribute(!showContribute)}
            >
              <DollarSign className="mr-1 h-3.5 w-3.5" /> Добавить вклад
            </Button>
          )}

          {!isOwner && item.status === "reserved" && item.reservation && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">
                Зарезервировал: {item.reservation.reserved_by_name}
              </span>
              <Button size="sm" variant="ghost" onClick={handleUnreserve} disabled={loading}>
                <Unlock className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Reserve form */}
          {showReserve && (
            <div className="flex gap-2">
              <Input
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button size="sm" onClick={handleReserve} disabled={loading}>
                OK
              </Button>
            </div>
          )}

          {/* Contribute form */}
          {showContribute && (
            <div className="space-y-2">
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
                <Button size="sm" onClick={handleContribute} disabled={loading}>
                  Внести
                </Button>
              </div>
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <Button size="sm" variant="destructive" onClick={handleDeleteItem}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Удалить
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
