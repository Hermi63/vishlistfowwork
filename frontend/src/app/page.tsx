"use client";

import { useRef, Suspense, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  ArrowRight,
  Gift,
  Users,
  Eye,
  Share2,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { useState } from "react";

// Ленивая загрузка 3D-сцены
const HeroScene = dynamic(
  () => import("@/components/scene-3d").then((m) => ({ default: m.HeroScene })),
  { ssr: false }
);

// Анимированная секция с reveal при скролле
function RevealSection({ children, className = "", delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Анимированный счётчик
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.span
      ref={ref}
      className="stat-number text-5xl sm:text-6xl font-extrabold"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
    >
      {isInView ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {value.toLocaleString("ru-RU")}{suffix}
        </motion.span>
      ) : "0"}
    </motion.span>
  );
}

// Карусель демо с автопрокруткой и свайпом
const demoSlides = [
  {
    title: "Создай вишлист",
    description: "Заполни название, добавь подарки с ссылками — всё за пару минут, даже без регистрации",
    icon: Gift,
    items: [
      { name: "PlayStation 5", status: "добавлено", accent: false },
      { name: "Наушники Sony WH-1000XM5", status: "добавлено", accent: false },
      { name: "Книга «Атлант расправил плечи»", status: "добавлено", accent: false },
    ],
  },
  {
    title: "Друзья видят список",
    description: "Переходят по ссылке и резервируют подарки — ты не узнаешь, кто что готовит",
    icon: Users,
    items: [
      { name: "PlayStation 5", status: "зарезервировано", accent: true },
      { name: "Наушники Sony WH-1000XM5", status: "резервировать", accent: false },
      { name: "Книга «Атлант расправил плечи»", status: "резервировать", accent: false },
    ],
  },
  {
    title: "Скидываются вместе",
    description: "На дорогой подарок собирают деньги вместе — прогресс виден в реальном времени",
    icon: Share2,
    items: [],
    pooling: true,
  },
];

function DemoCarousel() {
  const [current, setCurrent] = useState(0);
  const slide = demoSlides[current];

  // Автопрокрутка каждые 5 секунд
  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % demoSlides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, current]);

  // Поддержка свайпа
  const touchStartX = useRef(0);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrent((c) => (c + 1) % demoSlides.length);
      } else {
        setCurrent((c) => (c - 1 + demoSlides.length) % demoSlides.length);
      }
    }
  }

  return (
    <div
      className="relative max-w-3xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="glass-card rounded-3xl p-8 sm:p-10">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-start gap-8"
        >
          {/* Текст */}
          <div className="flex-1 min-w-0">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-purple-500">
              <slide.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">{slide.title}</h3>
            <p className="text-muted leading-relaxed text-sm">{slide.description}</p>
          </div>

          {/* Мокап */}
          <div className="flex-1 min-w-0 w-full">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              {slide.pooling ? (
                <>
                  <div className="mb-2 font-semibold text-sm">PlayStation 5</div>
                  <div className="mb-2 text-xs text-muted">Совместный сбор</div>
                  <div className="mb-2 h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-purple-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "65%" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mb-3">
                    <span className="text-muted">Собрано 65%</span>
                    <span className="font-medium">32 500 / 50 000 ₽</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted">
                    <div className="flex justify-between"><span>Аня</span><span>10 000 ₽</span></div>
                    <div className="flex justify-between"><span>Петя</span><span>12 500 ₽</span></div>
                    <div className="flex justify-between"><span>Катя</span><span>10 000 ₽</span></div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {slide.items.map((item) => (
                    <div
                      key={item.name}
                      className={`flex items-center justify-between rounded-xl p-3 text-xs ${
                        item.accent
                          ? "bg-green-500/10 border border-green-500/20"
                          : "bg-white/[0.02] border border-white/5"
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 ${
                        item.accent
                          ? "bg-green-500/20 text-green-400"
                          : "text-muted"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Навигация — только точки, без стрелок */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {demoSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-8 bg-accent" : "w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Фичи
const features = [
  {
    icon: Share2,
    title: "Без регистрации",
    desc: "Ссылка работает для всех. Друзья видят желания без аккаунта.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: Users,
    title: "Совместный сбор",
    desc: "Несколько человек скидываются на дорогой подарок. Прогресс в реальном времени.",
    gradient: "from-accent to-purple-500",
  },
  {
    icon: Eye,
    title: "Полная тайна",
    desc: "Владелец не знает, кто зарезервировал. Сюрприз гарантирован.",
    gradient: "from-pink-500 to-rose-400",
  },
  {
    icon: Zap,
    title: "Мгновенно",
    desc: "Создание списка за 30 секунд. Вставь ссылку — данные подтянутся автоматически.",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    icon: Shield,
    title: "Приватность",
    desc: "Публичная ссылка, но скрытые резервации. Полный контроль видимости.",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    icon: Sparkles,
    title: "WebSocket Realtime",
    desc: "Моментальные обновления без перезагрузки. Всё синхронизировано.",
    gradient: "from-violet-400 to-indigo-500",
  },
];

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -50]);

  return (
    <div className="noise-overlay">
      {/* Scroll progress */}
      <motion.div
        className="scroll-progress"
        style={{ scaleX: scrollYProgress }}
      />

      {/* === HERO === */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 3D-фон */}
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>

        {/* Градиентный overlay */}
        <div className="absolute inset-0 hero-dark-gradient z-[1]" />

        {/* Контент */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 mx-auto max-w-5xl px-6 text-center"
        >
          {/* Бейдж */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-accent-light backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4" />
            Платформа для вишлистов нового поколения
          </motion.div>

          {/* Заголовок */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95]"
          >
            Подарки, которые
            <br />
            <span className="text-gradient">действительно нужны</span>
          </motion.h1>

          {/* Подзаголовок */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-12 max-w-2xl mx-auto text-lg sm:text-xl text-zinc-400 leading-relaxed"
          >
            Создай список желаний, поделись ссылкой — друзья зарезервируют
            подарки или скинутся вместе. Ты не узнаешь, кто готовит сюрприз.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/create-wishlist">
              <Button size="lg" variant="gradient" className="text-base px-10 h-14 rounded-2xl shadow-glow group">
                Создай вишлист
                <ArrowRight className="h-5 w-5 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base px-10 h-14 rounded-2xl btn-outline-glow">
                Войти
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Градиент снизу */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050510] to-transparent z-[2]" />
      </section>

      {/* Разделитель */}
      <div className="glow-line mx-auto max-w-4xl" />

      {/* === СТАТИСТИКА === */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-3 gap-8 sm:gap-12">
            {[
              { value: 150, suffix: "+", label: "Вишлистов создано" },
              { value: 500, suffix: "+", label: "Подарков добавлено" },
              { value: 200, suffix: "+", label: "Подарков зарезервировано" },
            ].map((stat, i) => (
              <RevealSection key={stat.label} delay={i * 0.1} className="text-center">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                <p className="mt-2 text-sm text-zinc-500">{stat.label}</p>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line mx-auto max-w-4xl" />

      {/* === КАК ЭТО ВЫГЛЯДИТ (демо) === */}
      <section className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-5xl px-6">
          <RevealSection className="text-center mb-16">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-4">Демонстрация</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Как это выглядит
            </h2>
            <p className="text-zinc-400 text-lg max-w-lg mx-auto">
              Три шага от идеи до идеального подарка
            </p>
          </RevealSection>

          <RevealSection delay={0.2}>
            <DemoCarousel />
          </RevealSection>
        </div>
      </section>

      <div className="glow-line mx-auto max-w-4xl" />

      {/* === ФИЧИ === */}
      <section className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-6xl px-6">
          <RevealSection className="text-center mb-16">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-4">Возможности</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Всё что нужно
            </h2>
            <p className="text-zinc-400 text-lg max-w-lg mx-auto">
              Продуманный опыт для создателя и его друзей
            </p>
          </RevealSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <RevealSection key={feature.title} delay={i * 0.1}>
                <div className="glass-card gradient-border group flex flex-col gap-5 rounded-2xl p-8 h-full">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line mx-auto max-w-4xl" />

      {/* === КАК ЭТО РАБОТАЕТ (шаги) === */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6">
          <RevealSection className="text-center mb-16">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-4">Процесс</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Три шага
            </h2>
          </RevealSection>

          <div className="relative">
            {/* Вертикальная линия */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-accent/50 via-purple-500/50 to-pink-500/50 hidden sm:block" />

            {[
              {
                step: "01",
                title: "Создай список",
                desc: "Добавь подарки с ссылками — цена и картинка подтянутся автоматически. Регистрация не нужна.",
                color: "from-accent to-blue-500",
              },
              {
                step: "02",
                title: "Поделись ссылкой",
                desc: "Отправь ссылку друзьям в любой мессенджер. Им не нужен аккаунт, чтобы всё увидеть.",
                color: "from-purple-500 to-accent",
              },
              {
                step: "03",
                title: "Получи сюрприз",
                desc: "Друзья резервируют подарки или скидываются. Ты не узнаешь, кто что готовит — до самого дня.",
                color: "from-pink-500 to-purple-500",
              },
            ].map((item, i) => (
              <RevealSection key={item.step} delay={i * 0.15}>
                <div className="flex gap-6 sm:gap-8 mb-12 last:mb-0">
                  <div className={`shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-2xl font-extrabold text-white shadow-lg`}>
                    {item.step}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line mx-auto max-w-4xl" />

      {/* === ФИНАЛЬНЫЙ CTA === */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        {/* Фоновый градиент */}
        <div className="absolute inset-0 hero-dark-gradient opacity-50" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <RevealSection>
            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
              Готов получить
              <br />
              <span className="text-gradient">идеальный подарок?</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
              Создай вишлист прямо сейчас — это бесплатно и занимает 30 секунд.
              Регистрация не нужна.
            </p>
            <Link href="/create-wishlist">
              <Button size="lg" variant="gradient" className="text-lg px-12 h-16 rounded-2xl shadow-glow group">
                Создать вишлист
                <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* Футер */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-300">WishList</span>
          </div>
          <p>&copy; 2024 WishList. Создано с любовью к подаркам.</p>
        </div>
      </footer>
    </div>
  );
}
