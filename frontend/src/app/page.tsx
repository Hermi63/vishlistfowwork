"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Share2, Users, Eye, Sparkles, ArrowRight } from "lucide-react";

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
              <Link href="/register">
                <Button size="lg" variant="gradient" className="text-base px-8 h-14 rounded-2xl shadow-glow">
                  Начать бесплатно <ArrowRight className="h-5 w-5 ml-1" />
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
