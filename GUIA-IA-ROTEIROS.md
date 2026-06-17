# 🤖 Guia 2 — Conectando uma IA real aos roteiros

Hoje a skill `script.js` monta roteiros a partir de modelos prontos (templates). Funciona, mas os roteiros saem parecidos. Conectando uma IA de verdade, cada roteiro fica **único e adaptado ao tema** — o que ajuda a passar na regra de conteúdo original do YouTube.

Este guia usa a **API da Anthropic (Claude)** como exemplo. O modelo recomendado é o `claude-sonnet-4-6`, que equilibra qualidade e custo para esse tipo de tarefa.

> 💡 Não confunda: a IA gera um **rascunho melhor**, mas o roteiro continua pedindo o seu toque (`[INPUT HUMANO]`). A IA acelera; você dá a autenticidade.

---

## Parte A — Pegar a chave da API

1. Acesse **https://console.anthropic.com** e crie uma conta (ou entre).
2. Vá em **Settings > API Keys** (ou "Chaves de API").
3. Clique em **Create Key**, dê um nome (ex.: `canal-engine`) e **copie** a chave (começa com `sk-ant-...`).
4. Adicione créditos em **Billing** — essa API é paga por uso (veja custos no fim do guia). Com poucos dólares você gera centenas de roteiros.

---

## Parte B — Colocar a chave no sistema

No seu arquivo **`.env.local`** (o mesmo do guia do YouTube), adicione uma linha:

```
ANTHROPIC_API_KEY=sk-ant-...sua_chave_aqui
```

Salve. O arquivo já está protegido pelo `.gitignore`.

---

## Parte C — Instalar a biblioteca oficial

No terminal, dentro da pasta do projeto:

```bash
npm install @anthropic-ai/sdk
```

---

## Parte D — Ativar a IA no código

Abra **`lib/skills/script.js`**. No topo do arquivo, adicione o import e o cliente:

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

Depois, **adicione esta nova função** ao arquivo (não apague a antiga — ela vira o plano B):

```javascript
// Gera roteiro com IA real. Mantém as marcações [INPUT HUMANO]
// para garantir originalidade.
export async function generateScriptWithAI(idea) {
  const prompt = `Você é roteirista de um canal de YouTube de curiosidades e mistérios.
Crie um roteiro ORIGINAL para um vídeo sobre: "${idea.topic}".
Ângulo único a seguir: "${idea.angle}".

Regras:
- Estruture em: Gancho (0-15s), Desenvolvimento (3 pontos), Clímax, Encerramento.
- Em pelo menos 3 lugares, escreva exatamente "[INPUT HUMANO: ...]" indicando
  onde o criador deve inserir opinião pessoal, fonte verificada ou análise própria.
- NÃO invente fatos como se fossem verdade. Onde precisar de dado, marque [INPUT HUMANO: verificar].
- Tom envolvente, frases curtas, em português do Brasil.`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  // Junta o texto retornado
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
```

Agora faça o `generatePackage` usar a IA quando a chave existir. **Troque** a linha:

```javascript
const script = buildScriptDraft(idea);
```

por:

```javascript
let script;
try {
  script = process.env.ANTHROPIC_API_KEY
    ? await generateScriptWithAI(idea)   // IA real
    : buildScriptDraft(idea);            // plano B (template)
} catch (e) {
  console.error("IA falhou, usando template:", e.message);
  script = buildScriptDraft(idea);       // se a IA falhar, não quebra
}
```

E transforme `generatePackage` em `async` (ele agora espera a IA):

```javascript
export async function generatePackage(idea) {
```

Por fim, onde `generatePackage` é chamada — no **`scripts/seed.mjs`** e em qualquer rota que crie vídeos — coloque `await` antes:

```javascript
const pkg = await generatePackage(idea);
```

---

## Pronto!

Rode `npm run seed` de novo. Os roteiros agora virão da IA, adaptados a cada tema — e com o `[INPUT HUMANO]` preservado. Se a chave faltar ou a IA falhar, o sistema usa o template automaticamente (não quebra).

---

## 💰 Quanto custa?

A API cobra por uso, separando texto que entra e texto que sai. O `claude-sonnet-4-6` custa **US$ 3 por milhão de tokens de entrada e US$ 15 por milhão de saída**. Na prática, um roteiro custa **frações de centavo**. Você controla o gasto pelos créditos que coloca — não há cobrança surpresa.

> Dica de economia: gere roteiro com IA só para as ideias que você realmente vai produzir (as de maior score), não para as 60 de uma vez.

---

## Próximo nível (opcional)

A mesma técnica funciona em outras skills:
- **`ideas.js`** — IA gera ângulos mais criativos e calcula originalidade comparando com seus vídeos antigos.
- **`thumbnail.js`** — o campo `prompt` já está pronto para mandar a uma API de geração de imagem.

Sempre o mesmo padrão: ache o bloco `>>> ONDE PLUGAR API REAL <<<`, troque a função, mantenha o formato de retorno.
