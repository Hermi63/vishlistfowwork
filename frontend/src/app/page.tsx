"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Share2, Users, Eye, Sparkles, ArrowRight, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const demoSlides = [
  {
    title: "Миша создаёт свой вишлист",
    description: "Заполняет название, добавляет подарки с ссылками — всё за пару минут, без регистрации",
    icon: Gift,
    gradient: "from-accent to-purple-500",
    mockup: (
      <div className="rounded-2xl border border-[var(--border)] bg-surface p-5 shadow-medium">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-purple-500" />
          <span className="font-bold">День рождения Миши</span>
        </div>
        <div className="space-y-2">
          {["PlayStation 5", "Наушники Sony WH-1000XM5", "Книга «Атлант расправил плечи»"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-xl bg-surface-hover p-3 text-sm">
              <span>{item}</span>
              <span className="text-xs text-muted">добавлено</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Друзья видят список",
    description: "Переходят по ссылке, выбирают подарок и резервируют — Миша не узнает кто что готовит",
    icon: Users,
    gradient: "from-blue-500 to-cyan-500",
    mockup: (
      <div className="rounded-2xl border border-[var(--border)] bg-surface p-5 shadow-medium">
        <div className="mb-3 font-bold">День рождения Миши</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-sm">
            <span>PlayStation 5</span>
            <span className="rounded-full bg-green-100 dark:bg-green-800 px-2 py-0.5 text-xs text-green-700 dark:text-green-300">зарезервировано</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-hover p-3 text-sm">
            <span>Наушники Sony WH-1000XM5</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent cursor-pointer">резервировать</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-hover p-3 text-sm">
            <span>Книга «Атлант расправил плечи»</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent cursor-pointer">резервировать</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Скидываются вместе",
    description: "На дорогой подарок можно собрать деньги вместе — прогресс виден в реальном времени",
    icon: Share2,
    gradient: "from-pink-500 to-rose-500",
    mockup: (
      <div className="rounded-2xl border border-[var(--border)] bg-surface p-5 shadow-medium">
        <div className="mb-3 font-bold">PlayStation 5</div>
        <div className="mb-2 text-sm text-muted">Совместный сбор</div>
        <div className="mb-3 h-3 rounded-full bg-surface-hover overflow-hidden">
          <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-accent to-purple-500" />
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-muted">Собрано 65%</span>
          <span className="font-semibold">32 500 / 50 000 ₽</span>
        </div>
        <div className="space-y-1.5 text-xs text-muted">
          <div>Аня — 10 000 ₽</div>
          <div>Петя — 12 500 ₽</div>
          <div>Катя — 10 000 ₽</div>
        </div>
      </div>
    ),
  },
];

function DemoCarousel() {
  const [current, setCurrent] = useState(0);
  const slide = demoSlides[current];

  return (
    <section className="w-full py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="animate-fade-in-up text-3xl sm:text-4xl font-extrabold tracking-tight text-center mb-4">
          Как это выглядит
        </h2>
        <p className="animate-fade-in-up delay-100 text-muted text-lg text-center mb-10 max-w-lg mx-auto">
          Пройдите по шагам и посмотрите, как работает вишлист
        </p>

        <div className="relative">
          {/* Карточка слайда */}
          <div className="flex flex-col sm:flex-row items-center gap-8 rounded-3xl border border-[var(--border)] bg-surface p-8 sm:p-10 shadow-large">
            {/* Текст */}
            <div className="flex-1 min-w-0">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${slide.gradient} shadow-medium`}>
                <slide.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{slide.title}</h3>
              <p className="text-muted leading-relaxed">{slide.description}</p>
            </div>

            {/* Мокап */}
            <div className="flex-1 min-w-0 w-full">
              {slide.mockup}
            </div>
          </div>

          {/* Навигация */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrent((c) => (c - 1 + demoSlides.length) % demoSlides.length)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-surface hover:bg-surface-hover transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-2">
              {demoSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === current ? "w-8 bg-accent" : "w-2.5 bg-[var(--border)]"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrent((c) => (c + 1) % demoSlides.length)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-surface hover:bg-surface-hover transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero секция */}
      <section className="relative w-full overflow-hidden hero-gradient-mesh">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pt-28 sm:pb-32">
          <div className="flex flex-col items-center text-center">
            {/* Бейдж */}
            <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-2 text-sm font-medium text-accent">
              <Sparkles className="h-4 w-4" />
              Бесплатная платформа для вишлистов
            </div>

            {/* Заголовок */}
            <h1 className="animate-fade-in-up delay-100 mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl leading-[1.1]">
              Подарки, которые
              <br />
              <span className="text-gradient">действительно нужны</span>
            </h1>

            {/* Подзаголовок */}
            <p className="animate-fade-in-up delay-200 mb-10 max-w-2xl text-lg sm:text-xl text-muted leading-relaxed">
              Создавайте списки желаний, делитесь ссылкой с друзьями.
              Они смогут зарезервировать подарок или скинуться вместе —
              а вы не узнаете, кто именно готовит сюрприз.
            </p>

            {/* CTA кнопки */}
            <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4">
              <Link href="/create-wishlist">
                <Button size="lg" variant="gradient" className="text-base px-8 h-14 rounded-2xl shadow-glow">
                  Создай вишлист <ArrowRight className="h-5 w-5 ml-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-base px-8 h-14 rounded-2xl">
                  Войти
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Декоративный градиент снизу */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Демо-карусель */}
      <DemoCarousel />

      {/* Фичи */}
      <section className="w-full py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="animate-fade-in-up text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Как это работает
            </h2>
            <p className="animate-fade-in-up delay-100 text-muted text-lg max-w-lg mx-auto">
              Три простых шага до идеального подарка
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Share2,
                title: "Делитесь ссылкой",
                desc: "Публичная ссылка работает без регистрации. Отправьте друзьям — и они увидят ваши желания.",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                icon: Users,
                title: "Скидывайтесь вместе",
                desc: "Несколько друзей могут собрать на дорогой подарок. Прогресс сбора виден в реальном времени.",
                gradient: "from-accent to-purple-500",
              },
              {
                icon: Eye,
                title: "Сюрприз сохранён",
                desc: "Владелец не видит, кто зарезервировал подарок. Интрига остаётся до самого события.",
                gradient: "from-pink-500 to-rose-500",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-fade-in-up delay-${(i + 1) * 100} group flex flex-col items-center gap-5 rounded-3xl border border-[var(--border)] bg-surface p-8 text-center card-hover`}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-medium transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
