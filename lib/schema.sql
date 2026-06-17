-- ============================================================
-- Canal Engine — Schema do banco de dados (SQLite)
-- Cada tabela suporta uma das tarefas do sistema.
-- ============================================================

-- Canais (multicanal desde o início — Tarefa: escalar para 3 canais)
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
  created_at         TEXT DEFAULT (datetime('now'))
);

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
