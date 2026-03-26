"use client";

// Лёгкая замена 3D-сцены на CSS-анимацию
// Убрали Three.js, @react-three/fiber, @react-three/drei — экономия ~600KB бандла

export function HeroScene() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Градиентные орбы — чистый CSS, GPU-accelerated */}
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />
      <div className="hero-orb hero-orb-4" />

      {/* Плавающие частицы через CSS */}
      <div className="hero-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="hero-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
            }}
          />
        ))}
      </div>

      {/* CSS 3D подарок — лёгкая иконка вместо WebGL */}
      <div className="hero-gift-icon">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="50" width="80" height="60" rx="8" fill="url(#giftGrad)" opacity="0.6" />
          <rect x="15" y="40" width="90" height="18" rx="6" fill="url(#giftGrad2)" opacity="0.7" />
          <rect x="55" y="40" width="10" height="70" rx="2" fill="#f0abfc" opacity="0.5" />
          <rect x="20" y="55" width="80" height="10" rx="2" fill="#f0abfc" opacity="0.4" />
          <circle cx="60" cy="35" r="8" fill="#f0abfc" opacity="0.6" />
          <defs>
            <linearGradient id="giftGrad" x1="20" y1="50" x2="100" y2="110" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="giftGrad2" x1="15" y1="40" x2="105" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
