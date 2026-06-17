# 🔌 Guia 1 — Conectando a API do YouTube (dados reais)

Este guia troca os dados de exemplo por dados reais do YouTube. É **gratuito** e leva uns 10 minutos. Você não precisa saber programar — é copiar, colar e seguir os passos.

---

## Parte A — Pegar sua chave da API (no site do Google)

> A chave é como uma senha que deixa o seu sistema "conversar" com o YouTube. É grátis: o Google dá **10.000 unidades por dia**, mais que suficiente para começar.

1. Acesse **https://console.cloud.google.com** e entre com sua conta Google.
2. No topo da tela, clique no **seletor de projeto** e depois em **"Novo projeto"**. Dê um nome (ex.: `Canal Engine`) e clique em **Criar**.
3. Confirme que o projeto novo está selecionado no topo.
4. No menu lateral, vá em **APIs e Serviços > Biblioteca**.
5. Na busca, digite **YouTube Data API v3** e clique no resultado.
6. Clique no botão azul **Ativar**.
7. Agora vá em **APIs e Serviços > Credenciais**.
8. Clique em **Criar credenciais > Chave de API**.
9. Em 2-3 segundos sua chave aparece. **Copie** (algo como `AIzaSy...`).

> 🔒 **Segurança:** clique em "Restringir chave" e limite à "YouTube Data API v3". Isso evita uso indevido se a chave vazar.

---

## Parte B — Colocar a chave no sistema

1. Na pasta do projeto, crie um arquivo chamado **`.env.local`** (com o ponto na frente).
2. Dentro dele, escreva (trocando pela sua chave):

```
YOUTUBE_API_KEY=AIzaSy...sua_chave_aqui
```

3. Salve. **Nunca compartilhe esse arquivo** — ele já está protegido no `.gitignore`.

---

## Parte C — Ativar os dados reais no código

Abra o arquivo **`lib/skills/trends.js`**. Você vai ver um bloco marcado:

```
>>> ONDE PLUGAR API REAL <<<
```

Substitua a função `fetchRawTrends(...)` pela versão real abaixo. Ela busca os vídeos mais populares do Brasil e os transforma em tendências:

```javascript
// VERSÃO REAL — busca vídeos populares do YouTube
async function fetchRawTrends(niche, count) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Falta YOUTUBE_API_KEY no arquivo .env.local");

  const url = `https://www.googleapis.com/youtube/v3/videos`
    + `?part=snippet,statistics&chart=mostPopular&regionCode=BR`
    + `&maxResults=${Math.min(count, 50)}&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao chamar o YouTube: " + res.status);
  const data = await res.json();

  return data.items.map((v) => {
    const views = Number(v.statistics?.viewCount || 0);
    const likes = Number(v.statistics?.likeCount || 0);
    // converte números reais em notas de 0-100 para o ranking
    const viewsScore = Math.min(100, Math.log10(Math.max(1, views)) * 14);
    const engageScore = views ? Math.min(100, (likes / views) * 2000) : 0;
    return {
      topic: v.snippet.title,
      source: `YouTube · canal: ${v.snippet.channelTitle}`,
      views: Math.round(viewsScore),
      retention: Math.round(engageScore),
      ease: 60,            // ajuste conforme seu fluxo
      monetization: 60,    // ajuste conforme seu nicho
    };
  });
}
```

E troque a função que exporta para `async` (ela agora espera a internet):

```javascript
export async function researchTrends(niche, count = 10) {
  const raw = await fetchRawTrends(niche, count);
  return raw.map((t) => ({ ...t, score: weightedScore(t) }))
            .sort((a, b) => b.score - a.score);
}
```

Por fim, onde `researchTrends` é chamada (em `app/api/trends/route.js` e `app/api/run-all/route.js`), adicione `await` antes dela. Exemplo:

```javascript
const trends = await researchTrends(channel.niche, count);
```

Pronto. Agora a aba de tendências mostra vídeos reais em alta no YouTube.

---

## Próximos passos (quando quiser ir além)

| Quer isto | Use isto |
|-----------|----------|
| Métricas reais do SEU canal (views, CTR, retenção) | YouTube **Analytics** API (precisa de login OAuth, não só chave) |
| Roteiros e ideias com IA de verdade | API de um modelo de IA (ex.: Anthropic) na skill `script.js` |
| Volume de busca real para SEO | VidIQ, TubeBuddy ou Google Keyword Planner na skill `seo.js` |

Cada uma segue a mesma lógica: ache o bloco `>>> ONDE PLUGAR API REAL <<<` e troque a função, mantendo o formato de retorno.

---

## ⚠️ Sobre o limite diário

A cota grátis é de **10.000 unidades/dia**. Buscar vídeos populares custa pouco, mas **buscas** (`search`) custam 100 unidades cada — ou seja, ~100 buscas por dia. Se precisar de mais, dá para pedir aumento ao Google ou usar serviços pagos. Para começar, a cota grátis basta.
