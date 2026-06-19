-- ============================================================
-- Canal Engine — Schema do banco de dados (SQLite)
-- Cada tabela suporta uma das tarefas do sistema.
-- ============================================================

-- Canais (multicanal desde o início — Tarefa: escalar para 3 canais)
-- Usuários (FASE 2 — Autenticação).
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  plan          TEXT DEFAULT 'free',   -- free | pro | agency (FASE 4)
  role          TEXT DEFAULT 'user',   -- user | admin
  workspace_id  INTEGER,               -- workspace primária do usuário (FASE 3)
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Workspaces (FASE 3 — Multiusuário). Cada usuário tem a sua; existe 1 demo.
CREATE TABLE IF NOT EXISTS workspaces (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  owner_user_id INTEGER REFERENCES users(id),   -- NULL = sistema (demo)
  is_demo       INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);

-- Planos e monetização SaaS (FASE 4). Estrutura pronta para gateways,
-- sem processar pagamento real nesta etapa.
CREATE TABLE IF NOT EXISTS plans (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  code                     TEXT NOT NULL UNIQUE, -- free | pro | agency
  name                     TEXT NOT NULL,
  channel_limit            INTEGER,              -- NULL = ilimitado
  idea_limit_monthly       INTEGER,              -- NULL = ilimitado
  execution_limit_monthly  INTEGER,              -- NULL = ilimitado
  workspace_limit          INTEGER,              -- NULL = ilimitado
  priority_processing      INTEGER DEFAULT 0,
  active                   INTEGER DEFAULT 1,
  created_at               TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                  INTEGER REFERENCES users(id),
  workspace_id             INTEGER REFERENCES workspaces(id),
  plan_code                TEXT NOT NULL DEFAULT 'free',
  status                   TEXT DEFAULT 'active',
  provider                 TEXT DEFAULT 'manual',
  provider_customer_id     TEXT,
  provider_subscription_id TEXT,
  current_period_start     TEXT DEFAULT (date('now','start of month')),
  current_period_end       TEXT DEFAULT (date('now','start of month','+1 month')),
  created_at               TEXT DEFAULT (datetime('now')),
  updated_at               TEXT DEFAULT (datetime('now')),
  UNIQUE(workspace_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_code);

CREATE TABLE IF NOT EXISTS usage_tracking (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id  INTEGER REFERENCES workspaces(id),
  user_id       INTEGER REFERENCES users(id),
  metric        TEXT NOT NULL,           -- channels | ideas | executions
  period        TEXT NOT NULL,           -- YYYY-MM
  used          INTEGER DEFAULT 0,
  limit_value   INTEGER,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(workspace_id, metric, period)
);
CREATE INDEX IF NOT EXISTS idx_usage_workspace_period ON usage_tracking(workspace_id, period);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);

CREATE TABLE IF NOT EXISTS billing_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id   INTEGER REFERENCES workspaces(id),
  user_id        INTEGER REFERENCES users(id),
  provider       TEXT DEFAULT 'manual',  -- stripe | mercado_pago | pix | manual
  event_type     TEXT NOT NULL,
  status         TEXT DEFAULT 'pending',
  plan_code      TEXT,
  amount_cents   INTEGER,
  currency       TEXT DEFAULT 'BRL',
  payload        TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_billing_workspace ON billing_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_events(status);

CREATE TABLE IF NOT EXISTS billing_prices (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_code         TEXT NOT NULL,
  interval          TEXT NOT NULL,       -- monthly | annual
  provider          TEXT NOT NULL,       -- stripe | mercado_pago | pix
  provider_price_id TEXT,
  amount_cents      INTEGER DEFAULT 0,
  currency          TEXT DEFAULT 'BRL',
  active            INTEGER DEFAULT 1,
  created_at        TEXT DEFAULT (datetime('now')),
  UNIQUE(plan_code, interval, provider)
);
CREATE INDEX IF NOT EXISTS idx_billing_prices_plan ON billing_prices(plan_code, interval);

CREATE TABLE IF NOT EXISTS invoices (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id        INTEGER REFERENCES workspaces(id),
  user_id             INTEGER REFERENCES users(id),
  subscription_id     INTEGER REFERENCES subscriptions(id),
  provider            TEXT NOT NULL,
  provider_invoice_id TEXT,
  plan_code           TEXT,
  interval            TEXT,
  status              TEXT DEFAULT 'open',
  amount_cents        INTEGER DEFAULT 0,
  currency            TEXT DEFAULT 'BRL',
  hosted_url          TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  paid_at             TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS provider_webhooks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  provider       TEXT NOT NULL,
  event_id       TEXT,
  event_type     TEXT,
  status         TEXT DEFAULT 'received',
  payload        TEXT,
  error          TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  processed_at   TEXT,
  UNIQUE(provider, event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhooks_provider ON provider_webhooks(provider, status);

CREATE TABLE IF NOT EXISTS ai_generations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id   INTEGER REFERENCES workspaces(id),
  user_id        INTEGER REFERENCES users(id),
  channel_id     INTEGER REFERENCES channels(id),
  provider       TEXT NOT NULL,
  task           TEXT NOT NULL,
  prompt         TEXT,
  result_json    TEXT,
  tokens_in      INTEGER DEFAULT 0,
  tokens_out     INTEGER DEFAULT 0,
  status         TEXT DEFAULT 'completed',
  error          TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_workspace ON ai_generations(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_channel ON ai_generations(channel_id, task);

CREATE TABLE IF NOT EXISTS system_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id   INTEGER REFERENCES workspaces(id),
  user_id        INTEGER REFERENCES users(id),
  level          TEXT DEFAULT 'info',
  source         TEXT NOT NULL,
  message        TEXT NOT NULL,
  context_json   TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_system_events_source ON system_events(source, level);
CREATE INDEX IF NOT EXISTS idx_system_events_workspace ON system_events(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS channels (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  niche              TEXT NOT NULL,
  description        TEXT,
  target_audience    TEXT,                 -- público-alvo
  language           TEXT DEFAULT 'pt-BR', -- idioma
  strategy           TEXT,                 -- estratégia em uma frase
  posting_frequency  TEXT,                 -- ex.: "2 vídeos/semana"
  main_goal          TEXT,                 -- objetivo principal
  active             INTEGER DEFAULT 1,    -- 1 ativo | 0 inativo
  workspace_id       INTEGER,              -- workspace dona (FASE 3); NULL→demo
  owner_user_id      INTEGER,              -- usuário dono; NULL = sistema/demo
  created_at         TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);

-- Tendências pesquisadas (Tarefa 1)
CREATE TABLE IF NOT EXISTS trends (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id      INTEGER REFERENCES channels(id),
  topic           TEXT NOT NULL,
  source          TEXT,                 -- de onde veio (placeholder p/ API real)
  views_potential INTEGER DEFAULT 0,    -- 0-100
  retention_pot   INTEGER DEFAULT 0,    -- 0-100
  production_ease INTEGER DEFAULT 0,    -- 0-100
  monetization    INTEGER DEFAULT 0,    -- 0-100
  score           REAL DEFAULT 0,       -- média ponderada
  collected_at    TEXT DEFAULT (datetime('now'))
);

-- Ideias de vídeo (Tarefa 2)
CREATE TABLE IF NOT EXISTS ideas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id      INTEGER REFERENCES channels(id),
  format          TEXT NOT NULL,        -- 'long' | 'short'
  topic           TEXT NOT NULL,
  angle           TEXT,                 -- ângulo ÚNICO (anti-conteúdo-inautêntico)
  originality     INTEGER DEFAULT 0,    -- 0-100 nota de originalidade
  views_potential INTEGER DEFAULT 0,
  score           REAL DEFAULT 0,
  status          TEXT DEFAULT 'idea',  -- idea | approved | rejected | produced
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Vídeos em produção/publicados (Tarefas 3, 4)
CREATE TABLE IF NOT EXISTS videos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id      INTEGER REFERENCES channels(id),
  idea_id         INTEGER REFERENCES ideas(id),
  format          TEXT NOT NULL,        -- 'long' | 'short'
  title           TEXT,
  description     TEXT,
  hashtags        TEXT,                 -- JSON array
  tags            TEXT,                 -- JSON array
  script          TEXT,                 -- roteiro (rascunho p/ input humano)
  cta             TEXT,
  human_input     INTEGER DEFAULT 0,    -- 0/1: passou por revisão humana?
  variation_note  TEXT,                 -- o que torna ESTE vídeo diferente
  status          TEXT DEFAULT 'pending', -- pending | scripted | filmed | published
  parent_id       INTEGER,              -- se for short derivado de um long
  created_at      TEXT DEFAULT (datetime('now')),
  published_at    TEXT
);

-- Posts derivados para redes sociais (Tarefa 4)
CREATE TABLE IF NOT EXISTS social_posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    INTEGER REFERENCES videos(id),
  platform    TEXT,                     -- instagram | tiktok | x | etc.
  content     TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- SEO / palavras-chave (Tarefa 6)
CREATE TABLE IF NOT EXISTS keywords (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id    INTEGER REFERENCES channels(id),
  video_id      INTEGER REFERENCES videos(id),  -- keyword vinculada a um vídeo (NULL = pool do canal)
  keyword       TEXT NOT NULL,
  intent        TEXT,                   -- informational | curiosity | howto | news | commercial
  search_volume INTEGER DEFAULT 0,      -- placeholder p/ API real
  competition   INTEGER DEFAULT 0,      -- 0-100
  difficulty    REAL DEFAULT 0,         -- 0-100 (heurística local)
  potential     REAL DEFAULT 0,         -- 0-100 (heurística local)
  trend         TEXT,                   -- up | flat | down
  opportunity   REAL DEFAULT 0,         -- score = volume vs competição
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Pacote de SEO por vídeo (Fase: SEO Profissional) — gerado na produção.
CREATE TABLE IF NOT EXISTS seo_packages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id     INTEGER REFERENCES videos(id),
  main_title   TEXT,
  alt_titles   TEXT,                    -- JSON array (5 títulos alternativos)
  description  TEXT,                    -- descrição otimizada
  tags         TEXT,                    -- JSON array
  hashtags     TEXT,                    -- JSON array
  keywords     TEXT,                    -- JSON array de {keyword,intent,difficulty,potential}
  difficulty   REAL DEFAULT 0,          -- dificuldade média 0-100
  potential    REAL DEFAULT 0,          -- potencial de busca médio 0-100
  seo_score    REAL DEFAULT 0,          -- score SEO consolidado 0-100
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Métricas de performance (Tarefas 8 — memória de aprendizado)
CREATE TABLE IF NOT EXISTS metrics (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id     INTEGER REFERENCES videos(id),
  ctr          REAL DEFAULT 0,          -- %
  retention    REAL DEFAULT 0,          -- %
  views        INTEGER DEFAULT 0,
  subs_gained  INTEGER DEFAULT 0,
  recorded_at  TEXT DEFAULT (datetime('now'))
);

-- Thumbnails (Tarefa 9)
CREATE TABLE IF NOT EXISTS thumbnails (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id     INTEGER REFERENCES videos(id),
  prompt       TEXT,                    -- prompt de geração de imagem
  overlay_text TEXT,                    -- texto da thumb
  visual_idea  TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Estratégia por horizonte (Tarefa 10)
CREATE TABLE IF NOT EXISTS strategy (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id  INTEGER REFERENCES channels(id),
  horizon     TEXT NOT NULL,            -- 30d | 90d | 180d | 365d
  goal        TEXT,
  actions     TEXT,                     -- JSON array de ações
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Aprendizado: padrões vencedores (Tarefa 8 — memória permanente)
CREATE TABLE IF NOT EXISTS learnings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id  INTEGER REFERENCES channels(id),
  pattern     TEXT,                     -- ex.: "títulos com número performam +X%"
  evidence    TEXT,
  confidence  INTEGER DEFAULT 0,        -- 0-100
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Variações de thumbnail (Thumbnail Engine) — 3 por vídeo.
CREATE TABLE IF NOT EXISTS thumb_variants (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id     INTEGER REFERENCES videos(id),
  variant      INTEGER,                 -- 1..3
  main_text    TEXT,
  alt_text     TEXT,
  emotion      TEXT,                    -- emoção dominante
  prompt       TEXT,                    -- prompt para IA de imagem
  ctr_estimate REAL DEFAULT 0,          -- CTR estimado (heurístico)
  recommended  INTEGER DEFAULT 0,       -- 1 = melhor opção
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Distribuição multiplataforma — 1 linha por plataforma por vídeo.
CREATE TABLE IF NOT EXISTS distributions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id    INTEGER REFERENCES channels(id),
  video_id      INTEGER REFERENCES videos(id),
  platform      TEXT,                   -- youtube | tiktok | instagram_reels | ...
  title         TEXT,
  caption       TEXT,
  hashtags      TEXT,                   -- JSON array
  cta           TEXT,
  format        TEXT,                   -- ex.: "short · 9:16"
  checklist     TEXT,                   -- JSON array
  status        TEXT DEFAULT 'rascunho',-- rascunho|pronto|agendado|publicado|erro|cancelado
  scheduled_at  TEXT,                   -- data de publicação agendada (ISO)
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Logs de ações (auditoria simples por canal).
CREATE TABLE IF NOT EXISTS logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id   INTEGER REFERENCES channels(id),
  action       TEXT,                    -- ideias|producao|seo|thumbnails|distribuicao|agendamento
  entity       TEXT,                    -- descrição do conteúdo afetado
  status_from  TEXT,
  status_to    TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Filas (estrutura para processamento futuro; sem worker real agora).
CREATE TABLE IF NOT EXISTS queues (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id   INTEGER REFERENCES channels(id),
  type         TEXT,                    -- seo|thumbnails|distribuicao|agendamento
  ref_id       INTEGER,                 -- id do vídeo/conteúdo relacionado
  status       TEXT DEFAULT 'pendente', -- pendente|processando|concluido|erro
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Biblioteca de conteúdo reutilizável (roteiros, descrições, hashtags, prompts...).
CREATE TABLE IF NOT EXISTS library_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id   INTEGER REFERENCES channels(id),
  type         TEXT,                    -- roteiro|descricao|hashtags|prompt|thumbnail|post|titulo
  title        TEXT,
  content      TEXT,
  video_id     INTEGER REFERENCES videos(id),
  created_at   TEXT DEFAULT (datetime('now'))
);

-- AI Media Factory: assets originais preparados para geradores de IA.
CREATE TABLE IF NOT EXISTS media_assets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id   INTEGER REFERENCES channels(id),
  video_id     INTEGER REFERENCES videos(id),
  asset_type   TEXT NOT NULL,            -- image_prompt|thumbnail|storyboard|scene|video_package|short_package|distribution_package
  platform     TEXT,
  title        TEXT,
  prompt       TEXT,
  file_name    TEXT,
  file_path    TEXT,
  asset_mime   TEXT,
  asset_content TEXT,
  metadata     TEXT,                     -- JSON com estilo, emoção, proporção, duração, etc.
  status       TEXT DEFAULT 'prepared',  -- prepared|render_queue|rendered|review|blocked
  risk_level   TEXT DEFAULT 'seguro',    -- seguro|revisar|alto risco
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Execuções autônomas: operação completa planejada e executada dentro do sistema.
CREATE TABLE IF NOT EXISTS execution_runs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id       INTEGER REFERENCES channels(id),
  mode             TEXT NOT NULL,        -- seguro|crescimento|monetizacao|gerar_midia_ia
  status           TEXT DEFAULT 'running', -- running|completed|failed
  limits_json      TEXT,
  selected_json    TEXT,
  actions_json     TEXT,
  blocked_json     TEXT,
  errors_json      TEXT,
  started_at       TEXT DEFAULT (datetime('now')),
  finished_at      TEXT
);

CREATE TABLE IF NOT EXISTS execution_steps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      INTEGER REFERENCES execution_runs(id),
  name        TEXT NOT NULL,
  status      TEXT DEFAULT 'pending',    -- pending|running|completed|failed|skipped
  details     TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS execution_reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      INTEGER REFERENCES execution_runs(id),
  summary     TEXT,
  report_json TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Índices para acelerar os filtros por canal/vídeo (robustez).
CREATE INDEX IF NOT EXISTS idx_ideas_channel    ON ideas(channel_id);
CREATE INDEX IF NOT EXISTS idx_trends_channel   ON trends(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel    ON videos(channel_id, format);
CREATE INDEX IF NOT EXISTS idx_social_video      ON social_posts(video_id);
CREATE INDEX IF NOT EXISTS idx_keywords_channel  ON keywords(channel_id);
CREATE INDEX IF NOT EXISTS idx_keywords_video    ON keywords(video_id);
CREATE INDEX IF NOT EXISTS idx_metrics_video     ON metrics(video_id);
CREATE INDEX IF NOT EXISTS idx_thumbs_video      ON thumbnails(video_id);
CREATE INDEX IF NOT EXISTS idx_thumbvar_video    ON thumb_variants(video_id);
CREATE INDEX IF NOT EXISTS idx_dist_channel      ON distributions(channel_id);
CREATE INDEX IF NOT EXISTS idx_dist_video        ON distributions(video_id);
CREATE INDEX IF NOT EXISTS idx_seo_video         ON seo_packages(video_id);
CREATE INDEX IF NOT EXISTS idx_logs_channel      ON logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_queues_channel    ON queues(channel_id);
CREATE INDEX IF NOT EXISTS idx_library_channel   ON library_items(channel_id);
CREATE INDEX IF NOT EXISTS idx_strategy_channel  ON strategy(channel_id);
CREATE INDEX IF NOT EXISTS idx_learning_channel  ON learnings(channel_id);
CREATE INDEX IF NOT EXISTS idx_media_channel     ON media_assets(channel_id);
CREATE INDEX IF NOT EXISTS idx_media_video       ON media_assets(video_id);
CREATE INDEX IF NOT EXISTS idx_media_type        ON media_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_media_status      ON media_assets(status);
CREATE INDEX IF NOT EXISTS idx_exec_channel      ON execution_runs(channel_id);
CREATE INDEX IF NOT EXISTS idx_exec_status       ON execution_runs(status);
CREATE INDEX IF NOT EXISTS idx_exec_steps_run    ON execution_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_exec_reports_run  ON execution_reports(run_id);
