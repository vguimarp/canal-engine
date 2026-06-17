# 🎬 Canal Engine

**Sua central de inteligência e produção para canal de YouTube.**

Um sistema que pesquisa temas em alta, cria ideias de vídeos, monta roteiros, sugere palavras-chave (SEO), gera prompts de thumbnail e acompanha resultados — tudo numa interface simples, sem precisar saber programar.

> ⚠️ **Importante — leia antes de começar.** Este sistema foi desenhado para **produção assistida**, não para "fábrica de vídeos automáticos". Desde 15/07/2025 o YouTube desmonetiza canais com conteúdo repetitivo ou em massa (política de "conteúdo inautêntico"). Por isso, o sistema **força originalidade**: marca ideias parecidas demais, e todo roteiro pede um toque humano seu (`[INPUT HUMANO]`). Use-o para acelerar seu trabalho criativo — não para substituí-lo.

---

## 🚀 Como instalar (passo a passo para iniciantes)

Você precisa ter o **Node.js** instalado (versão 18 ou superior). Baixe em [nodejs.org](https://nodejs.org) se ainda não tem.

Depois, abra o terminal na pasta do projeto e digite:

```bash
npm install        # instala tudo (1ª vez, leva 1-2 min)
npm run setup      # prepara o banco com conteúdo de exemplo
npm run dev        # liga o sistema
```

Pronto! Abra o navegador em **http://localhost:3000**

Na primeira tela, clique no botão grande **"Fazer tudo agora"** e explore.

---

## 🗺️ As 5 telas do sistema

| Tela | Para que serve |
|------|----------------|
| **Painel** | Visão geral + botão "Fazer tudo" + guia passo a passo |
| **Ideias** | Banco de ideias de vídeos, com nota de originalidade |
| **Produção** | Roteiro, título, descrição, tags e thumbnail de cada vídeo |
| **SEO** | Palavras-chave ordenadas por oportunidade |
| **Estratégia** | Plano de crescimento em 30 / 90 / 180 / 365 dias |

---

## 🧠 O que o sistema faz por dentro (as "skills")

Cada função fica num módulo separado em `lib/skills/`:

| Módulo | Função |
|--------|--------|
| `trends.js` | Pesquisa e ranqueia temas em alta |
| `ideas.js` | Cria ideias com ângulo único + nota de originalidade |
| `script.js` | Monta título, descrição, tags, roteiro e CTA |
| `derivatives.js` | Gera 5 shorts + 5 posts a partir de cada vídeo |
| `seo.js` | Calcula oportunidade de palavras-chave |
| `thumbnail.js` | Cria prompts de imagem + texto da thumb |
| `strategy.js` | Planos de crescimento por período |
| `learning.js` | Aprende quais temas funcionam melhor |

---

## 🔌 Conectando dados reais (quando estiver pronto)

O sistema funciona **agora** com dados de demonstração. Quando quiser dados reais, cada skill tem um comentário marcado com:

```
>>> ONDE PLUGAR API REAL <<<
```

É só seguir a instrução ali. As APIs sugeridas:

- **Tendências e métricas** → YouTube Data API + YouTube Analytics API
- **Ideias e roteiros** → uma API de modelo de IA (ex.: Anthropic)
- **SEO** → Google Keyword Planner, Ahrefs, ou VidIQ/TubeBuddy
- **Thumbnails** → uma API de geração de imagem

A estrutura não muda — você só troca a fonte dos dados.

---

## 📊 Quer 3 canais?

O sistema já é **multicanal** por dentro (tabela `channels`). Para começar, opere bem **1 canal**; quando ele estiver consistente, adicione os outros pela mesma engine. A aba Estratégia te orienta sobre quando escalar.

---

## ⚙️ Comandos úteis

```bash
npm run dev      # modo desenvolvimento (uso normal)
npm run build    # prepara versão otimizada
npm run start    # roda a versão otimizada
npm run seed     # recria o banco do zero (apaga e repõe exemplos)
npm run setup    # instalação automática completa
```

---

## 🧰 Tecnologia

Next.js · React · Tailwind CSS · SQLite (via better-sqlite3) · Node.js

## 📁 Estrutura

```
canal-engine/
├── app/              # páginas e rotas de API
│   ├── api/          # endpoints (dashboard, ideas, trends, seo...)
│   └── *.js          # telas (painel, ideias, produção, seo, estratégia)
├── components/       # peças de interface reutilizáveis
├── lib/
│   ├── skills/       # as 8 "skills" da engine
│   ├── db.js         # conexão com o banco
│   ├── queries.js    # consultas ao banco
│   └── schema.sql    # estrutura das tabelas
├── scripts/          # seed e instalação
└── data/             # o banco SQLite fica aqui
```

---

## ❓ Problemas comuns

**"command not found: npm"** → instale o Node.js em nodejs.org.

**A tela não carrega** → confira se rodou `npm run dev` e se aparece "ready" no terminal. Abra exatamente `http://localhost:3000`.

**Quero zerar tudo** → rode `npm run seed`. Isso apaga e recria o banco com os exemplos.

---

*Construído com foco em crescimento sustentável e conformidade com as políticas do YouTube. Não promete monetização garantida — promete acelerar seu trabalho do jeito certo.*
