# ✅ Checklist de Testes — Canal Engine

Use esta lista para confirmar que tudo funciona depois de instalar.

## Instalação

- [ ] `npm install` roda sem erros
- [ ] `npm run setup` cria o banco e mostra "Tudo pronto!"
- [ ] `npm run dev` inicia e mostra "ready" no terminal
- [ ] `http://localhost:3000` abre no navegador

## Tela: Painel

- [ ] A página abre com o título "Sua central do canal"
- [ ] A dica amarela aparece no topo
- [ ] O botão grande "Fazer tudo agora" está visível
- [ ] Clicar no botão mostra "Trabalhando…" e depois uma mensagem verde de sucesso
- [ ] Os números (vídeos, ideias, palavras-chave) aparecem e aumentam após "Fazer tudo"
- [ ] A lista "Vídeos com mais visualizações" mostra barras
- [ ] "O que está funcionando" mostra ao menos um padrão aprendido

## Tela: Ideias

- [ ] A lista de ideias carrega, ordenada por score (maiores no topo)
- [ ] Cada ideia mostra etiqueta LONGO ou SHORT
- [ ] Ideias originais têm etiqueta verde; pouco originais, vermelha
- [ ] Os filtros "Todas / Longos / Shorts" funcionam
- [ ] O botão "Gerar mais" adiciona ideias novas

## Tela: Produção

- [ ] A lista de vídeos longos carrega
- [ ] Clicar em um vídeo expande e mostra descrição, tags, roteiro e prompt de thumb
- [ ] O roteiro contém marcações `[INPUT HUMANO]`
- [ ] Clicar de novo recolhe o vídeo

## Tela: SEO

- [ ] A tabela de palavras-chave carrega, ordenada por oportunidade
- [ ] Cada linha mostra volume, tendência (↑→↓) e barra de oportunidade
- [ ] O botão "Gerar keywords" adiciona novas

## Tela: Estratégia

- [ ] Os 4 períodos aparecem (30, 90, 180, 365 dias)
- [ ] Cada período mostra meta e lista de ações

## Celular (largura pequena)

- [ ] A barra superior com menu ☰ aparece
- [ ] Tocar no ☰ abre o menu de navegação
- [ ] As telas ficam legíveis e empilhadas

## APIs (opcional, para quem quiser conferir)

- [ ] `GET /api/dashboard` retorna JSON com counts e totals
- [ ] `GET /api/ideas` retorna lista de ideias
- [ ] `POST /api/run-all` retorna quantidades criadas
- [ ] `GET /api/metrics` retorna learnings

## Reset

- [ ] `npm run seed` zera e repõe o banco com exemplos
