"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { GoogleButton } from "@/components/google-button";
import { Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.register({ email, name, password });
      login(res.access_token, res.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSuccess = useCallback(
    async (idToken: string) => {
      setError("");
      setLoading(true);
      try {
        const res = await api.googleAuth(idToken);
        login(res.access_token, res.user);
        router.push("/dashboard");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка регистрации через Google");
      } finally {
        setLoading(false);
      }
    },
    [login, router]
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="animate-scale-in w-full max-w-md p-8 sm:p-10 shadow-large">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-medium">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Создать аккаунт</h1>
          <p className="mt-1 text-sm text-muted">Начните собирать вишлисты</p>
        </div>

        <GoogleButton onSuccess={handleGoogleSuccess} onError={setError} />

        <div className="my-6 flex items-center gap-3 text-sm text-muted">
          <span className="flex-1 border-t border-[var(--border)]" />
          или
          <span className="flex-1 border-t border-[var(--border)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Имя</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Пароль</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              minLength={8}
              required
            />
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
