"use client";
import { useEffect, useState } from "react";

// Onboarding de primeira visita — overlay guiado, dispensável (localStorage).
// Profissional e leve; não bloqueia quem já conhece o produto.
const KEY = "canal-engine:onboarded";

const STEPS = [
  {
    icon: "🎬",
    title: "Bem-vindo ao Canal Engine",
    body: "Sua central para descobrir nichos, criar conteúdo e distribuir em todas as plataformas — sem precisar saber programar.",
  },
  {
    icon: "🧪",
    title: "Teste vários canais",
    body: "Crie canais de nichos diferentes e veja, no ranking, qual tem maior potencial de audiência e de receita.",
  },
  {
    icon: "⚡",
    title: "Comece com 1 clique",
    body: "No Painel, clique em “Fazer tudo agora”. Ele pesquisa tendências, gera ideias e palavras-chave automaticamente.",
  },
  {
    icon: "🚀",
    title: "Produza e distribua",
    body: "Aprove ideias, gere roteiro + thumbnail + SEO, e adapte cada vídeo para YouTube, TikTok, Reels e mais.",
  },
];

export function useOnboarded() {
  const [done, setDone] = useState(true);
  useEffect(() => { setDone(typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1"); }, []);
  const finish = () => { try { window.localStorage.setItem(KEY, "1"); } catch {} setDone(true); };
  const reset = () => { try { window.localStorage.removeItem(KEY); } catch {} setDone(false); };
  return { done, finish, reset };
}

export default function Onboarding() {
  const { done, finish } = useOnboarded();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => { setShow(!done); }, [done]);
  if (!show) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const close = () => { setShow(false); finish(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 fade-in" role="dialog" aria-modal="true">
      <div className="ce-card w-full max-w-md p-7 relative">
        <button onClick={close} aria-label="Fechar"
          className="absolute top-3 right-4 text-ink-dim hover:text-ink text-sm">pular</button>

        <div className="text-4xl mb-4">{s.icon}</div>
        <h2 className="serif text-2xl text-ink mb-2">{s.title}</h2>
        <p className="text-ink-dim text-sm leading-relaxed mb-6">{s.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-amber" : "w-1.5 bg-line"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep((n) => n - 1)}
                className="text-[11px] tracking-wider uppercase px-3 py-2 border border-line text-ink-dim rounded-md hover:text-ink">
                Voltar
              </button>
            )}
            <button onClick={() => (last ? close() : setStep((n) => n + 1))}
              className="text-[11px] tracking-wider uppercase px-4 py-2 border border-amber text-amber rounded-md hover:bg-amber hover:text-paper transition-colors">
              {last ? "Começar" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tooltip simples e acessível (hover/focus).
export function Tooltip({ text, children }) {
  return (
    <span className="relative inline-flex items-center group">
      {children}
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-[220px]
        bg-paper-2 border border-line text-ink-dim text-[11px] px-2.5 py-1.5 rounded-md opacity-0
        group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-30 leading-snug shadow-lg">
        {text}
      </span>
    </span>
  );
}
