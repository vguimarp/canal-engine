export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-6 md:p-12 bg-paper text-ink">
      <div className="max-w-3xl mx-auto">
        <h1 className="serif text-4xl mb-6">Política de Privacidade</h1>
        <div className="space-y-4 text-sm text-ink-dim leading-relaxed">
          <p>Coletamos dados de conta, workspace, canais, ideias, conteúdos gerados, eventos de cobrança e logs operacionais necessários para operar o Canal Engine.</p>
          <p>Chaves de IA e pagamento devem ser configuradas como variáveis de ambiente e não são exibidas no painel.</p>
          <p>Dados de pagamento são processados pelos gateways integrados. O Canal Engine registra eventos e status, mas não deve armazenar cartão de crédito.</p>
          <p>Logs podem ser usados para segurança, suporte, auditoria e melhoria do produto.</p>
        </div>
      </div>
    </main>
  );
}
