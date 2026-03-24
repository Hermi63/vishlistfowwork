"use client";

import { useCallback, useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Sparkles } from "lucide-react";

// Ленивая загрузка Google кнопки — устраняет лаг при открытии страницы
const GoogleButton = lazy(() =>
  import("@/components/google-button").then((m) => ({ default: m.GoogleButton }))
);

// Создаёт вишлист из черновика в localStorage после успешной регистрации
async function createFromDraft() {
  const raw = localStorage.getItem("wishlist_draft");
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw);
    const res = await api.createWishlist({
      title: draft.title,
      description: draft.description,
      event_date: draft.event_date,
    });

    // Добавляем подарки из черновика
    if (draft.items?.length) {
      for (const item of draft.items) {
        await api.addItem(res.slug, {
          title: item.title,
          url: item.url,
          price: item.price ? parseFloat(item.price) : undefined,
        });
      }
    }

    localStorage.removeItem("wishlist_draft");
    return res.slug;
  } catch {
    localStorage.removeItem("wishlist_draft");
    return null;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // После успешной авторизации — проверяем черновик и редиректим
  const handlePostAuth = useCallback(
    async (token: string, userData: { id: number; email: string; name: string }) => {
      login(token, userData);
      // Всегда проверяем черновик в localStorage
      const slug = await createFromDraft();
      if (slug) {
        router.push(`/wishlist/${slug}`);
        return;
      }
      router.push("/dashboard");
    },
    [login, router]
  );

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Введите имя";
    if (!email.trim()) errors.email = "Введите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Некорректный email";
    if (!password) errors.password = "Введите пароль";
    else if (password.length < 8) errors.password = "Минимум 8 символов";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.register({ email, name, password });
      await handlePostAuth(res.access_token, res.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
      setLoading(false);
    }
  }

  const handleGoogleSuccess = useCallback(
    async (idToken: string) => {
      setError("");
      setLoading(true);
      try {
        const res = await api.googleAuth(idToken);
        await handlePostAuth(res.access_token, res.user);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка регистрации через Google");
        setLoading(false);
      }
    },
    [handlePostAuth]
  );

  function clearFieldError(field: string) {
    setFieldErrors((p) => ({ ...p, [field]: "" }));
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="animate-scale-in w-full max-w-md p-8 sm:p-10 shadow-large">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-medium">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Создать аккаунт</h1>
          <p className="mt-1 text-sm text-muted">
            Начните собирать вишлисты
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex h-[44px] w-full items-center justify-center rounded-lg border-2 border-[var(--border)] bg-surface-hover animate-pulse">
              <span className="text-sm text-muted">Загрузка Google...</span>
            </div>
          }
        >
          <GoogleButton onSuccess={handleGoogleSuccess} onError={setError} />
        </Suspense>

        <div className="my-6 flex items-center gap-3 text-sm text-muted">
          <span className="flex-1 border-t border-[var(--border)]" />
          или
          <span className="flex-1 border-t border-[var(--border)]" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Имя</label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
              placeholder="Ваше имя"
              className={fieldErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
            />
            {fieldErrors.name && (
              <p className="mt-1.5 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
              placeholder="your@email.com"
              className={fieldErrors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Пароль</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
              placeholder="Минимум 8 символов"
              className={fieldErrors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
            />
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400 animate-slide-down">
              {error}
            </div>
          )}
          <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-semibold text-accent hover:text-accent-dark transition-colors">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  );
}
