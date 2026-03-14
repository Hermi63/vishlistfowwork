"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              locale?: string;
            }
          ) => void;
        };
      };
    };
  }
}

interface GoogleButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: (error: string) => void;
}

export function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    const scriptId = "google-gsi-script";

    function initButton() {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId!,
        callback: (response) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError?.("Google не вернул токен");
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: 368,
        text: "signin_with",
        locale: "ru",
      });
    }

    if (document.getElementById(scriptId)) {
      initButton();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initButton;
    document.head.appendChild(script);
  }, [clientId, onSuccess, onError]);

  if (!clientId) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
