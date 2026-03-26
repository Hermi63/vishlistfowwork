"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { useToast } from "./ui/toast";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Lock,
  Unlock,
  DollarSign,
  Trash2,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
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

/* Утилита: генерируем цвет аватарки по имени */
function getAvatarColor(name: string): string {
  const colors = [
    "from-indigo-500 to-purple-500",
    "from-purple-500 to-pink-500",
    "from-pink-500 to-rose-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-cyan-500 to-blue-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/* Мини-аватарка с инициалом */
function MiniAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initial = name.charAt(0).toUpperCase();
  const colorClass = getAvatarColor(name);
  const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs";

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center font-bold text-white ring-2 ring-[#050510] shrink-0`}
      title={name}
    >
      {initial}
    </div>
  );
}

export function GiftCard({ item, slug, isOwner, onUpdate }: GiftCardProps) {
  const [showReserve, setShowReserve] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, confirm } = useToast();

  const statusLabel: Record<
    string,
    { text: string; color: string; icon: React.ReactNode; glow?: string }
  > = {
    available: {
      text: "Доступен",
      color:
        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      icon: <Gift className="h-3.5 w-3.5" />,
      glow: "shadow-[0_0_12px_-3px_rgba(52,211,153,0.3)]",
    },
    reserved: {
      text: "Зарезервирован",
      color:
        "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      icon: <Lock className="h-3.5 w-3.5" />,
    },
    crowdfunding: {
      text: "Сбор средств",
      color:
        "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
      icon: <Users className="h-3.5 w-3.5" />,
      glow: "shadow-[0_0_12px_-3px_rgba(99,102,241,0.3)]",
    },
    funded: {
      text: "Собрано!",
      color:
        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
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

  /* Процент для прогресса */
  const progressPct =
    item.price && item.price > 0
      ? Math.round((item.total_contributed / item.price) * 100)
      : 0;

  return (
    <Card className="overflow-hidden flex flex-col group/card">
      {/* Изображение */}
      {item.image_url ? (
        <div className="relative h-52 bg-white/[0.02] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          {/* Градиент на фото снизу для читаемости */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050510] via-transparent to-transparent opacity-60" />
          {/* Бейдж статуса на изображении */}
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md ${st.color} ${st.glow || ""}`}
            >
              {st.icon} {st.text}
            </span>
          </div>
          {/* Цена поверх изображения */}
          {item.price !== null && (
            <div className="absolute bottom-3 left-4">
              <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-lg">
                {item.price.toLocaleString("ru-RU")}{" "}
                <span className="text-base font-medium text-white/60">&#8381;</span>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-indigo-500/[0.06] via-purple-500/[0.04] to-pink-500/[0.06] overflow-hidden">
          {/* Декоративные элементы */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 left-4 h-16 w-16 rounded-full bg-indigo-500/10 blur-2xl" />
            <div className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-purple-500/10 blur-2xl" />
          </div>
          <Gift className="h-12 w-12 text-accent/20 transition-transform duration-500 group-hover/card:scale-110 group-hover/card:text-accent/30" />
          {/* Бейдж статуса */}
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.color} ${st.glow || ""}`}
            >
              {st.icon} {st.text}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Заголовок */}
        <div className="mb-2">
          <h3 className="font-bold text-[1.1rem] leading-tight text-zinc-100 group-hover/card:text-white transition-colors duration-300">
            {item.title}
          </h3>
        </div>

        {/* Описание */}
        {item.description && (
          <p className="mb-3 text-sm text-zinc-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Цена — показываем только если нет изображения (иначе на фото) */}
        {item.price !== null && !item.image_url && (
          <div className="mb-3">
            <span className="price-tag inline-flex items-center gap-1 text-lg font-extrabold tracking-tight text-zinc-100">
              {item.price.toLocaleString("ru-RU")}
              <span className="text-sm font-medium text-zinc-500">&#8381;</span>
            </span>
          </div>
        )}

        {/* Прогресс сбора средств */}
        {(item.status === "crowdfunding" || item.status === "funded") &&
          item.price && (
            <div className="mb-4">
              <div className="mb-2 flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-medium">
                  Собрано{" "}
                  <span className="text-zinc-300 font-bold">
                    {item.total_contributed.toLocaleString("ru-RU")} &#8381;
                  </span>
                </span>
                <span
                  className={`font-bold ${
                    progressPct >= 100 ? "text-emerald-400" : "text-accent"
                  }`}
                >
                  {progressPct}%
                </span>
              </div>
              <Progress value={item.total_contributed} max={item.price} />
            </div>
          )}

        {/* Список вкладов с аватарками */}
        {!isOwner && item.contributions.length > 0 && (
          <div className="mb-4 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="mb-2.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent/50" />
              Участники сбора
            </p>
            <div className="space-y-2">
              {item.contributions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MiniAvatar name={c.contributor_name} />
                    <span className="text-sm font-medium text-zinc-300 truncate">
                      {c.contributor_name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-accent shrink-0">
                    {c.amount.toLocaleString("ru-RU")} &#8381;
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Кнопки действий — прижаты к низу */}
        <div className="mt-auto flex flex-col gap-2.5 pt-3">
          {/* Ссылка на товар */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-accent transition-colors duration-200"
            >
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              Перейти к товару
            </a>
          )}

          {/* Действия гостя — доступен */}
          {!isOwner && item.status === "available" && (
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                variant="gradient"
                className="flex-1"
                onClick={() => {
                  setShowReserve(!showReserve);
                  setShowContribute(false);
                }}
              >
                <Lock className="h-3.5 w-3.5" /> Зарезервировать
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowContribute(!showContribute);
                  setShowReserve(false);
                }}
              >
                <DollarSign className="h-3.5 w-3.5" /> Скинуться
              </Button>
            </div>
          )}

          {/* Действия гостя — краудфандинг */}
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

          {/* Информация о резервировании */}
          {!isOwner && item.status === "reserved" && item.reservation && (
            <div className="flex items-center justify-between mt-1 rounded-xl bg-amber-500/[0.06] border border-amber-500/10 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <MiniAvatar name={item.reservation.reserved_by_name} size="md" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-zinc-500">Зарезервировал</span>
                  <span className="text-sm font-semibold text-zinc-300">
                    {item.reservation.reserved_by_name}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUnreserve}
                disabled={loading}
                className="text-zinc-500 hover:text-zinc-100"
              >
                <Unlock className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Форма резервирования с анимацией */}
          <AnimatePresence>
            {showReserve && (
              <motion.div
                className="flex gap-2"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Input
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReserve()}
                />
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={handleReserve}
                  disabled={loading || !name.trim()}
                >
                  OK
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Форма вклада с анимацией */}
          <AnimatePresence>
            {showContribute && (
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Input
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Сумма, &#8381;"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleContribute()}
                  />
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={handleContribute}
                    disabled={loading || !name.trim() || !amount}
                  >
                    Внести
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Удаление (для владельца) */}
          {isOwner && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteItem}
              className="mt-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Удалить
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
