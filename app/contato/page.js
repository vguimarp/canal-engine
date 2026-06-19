import Link from "next/link";

export default function ContatoPage() {
  return (
    <main className="min-h-screen bg-paper text-ink px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-amber text-xs tracking-[0.3em] mb-3">CONTATO</div>
        <h1 className="serif text-5xl mb-6">Fale com o Canal Engine</h1>
        <p className="text-ink-dim leading-relaxed text-lg">
          Para suporte, parcerias ou dúvidas comerciais, use o e-mail configurado pelo operador da plataforma. Enquanto o SMTP não estiver configurado, o contato comercial deve ser tratado manualmente.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="bg-amber text-paper px-5 py-3 rounded-md text-sm font-bold uppercase tracking-wide">Criar conta</Link>
          <Link href="/pricing" className="border border-line px-5 py-3 rounded-md text-sm uppercase tracking-wide text-ink-dim">Ver preços</Link>
        </div>
      </div>
    </main>
  );
}
