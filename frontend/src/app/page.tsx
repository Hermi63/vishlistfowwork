"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Gift, Share2, Users, Eye } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center pt-12 text-center">
      <div className="mb-4 rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
        <Gift className="h-12 w-12 text-blue-600" />
      </div>
      <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Социальный вишлист
      </h1>
      <p className="mb-8 max-w-lg text-lg text-neutral-500">
        Создавайте списки желаний, делитесь ссылкой с друзьями. Они смогут
        зарезервировать подарок или скинуться вместе — а вы не узнаете, кто
        именно готовит сюрприз.
      </p>
      <div className="flex gap-3">
        <Link href="/register">
          <Button size="lg">Начать бесплатно</Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="outline">
            Войти
          </Button>
        </Link>
      </div>

      <div className="mt-20 grid gap-8 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
          <Share2 className="h-8 w-8 text-blue-600" />
          <h3 className="font-semibold">Делитесь ссылкой</h3>
          <p className="text-sm text-neutral-500">
            Публичная ссылка работает без регистрации
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
          <Users className="h-8 w-8 text-blue-600" />
          <h3 className="font-semibold">Скидывайтесь вместе</h3>
          <p className="text-sm text-neutral-500">
            Несколько друзей могут собрать на дорогой подарок
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
          <Eye className="h-8 w-8 text-blue-600" />
          <h3 className="font-semibold">Сюрприз сохранён</h3>
          <p className="text-sm text-neutral-500">
            Владелец не видит, кто зарезервировал подарок
          </p>
        </div>
      </div>
    </div>
  );
}
