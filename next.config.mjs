/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 é nativo: mantém fora do bundle do servidor.
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
    // Inclui o schema e o banco-semente no bundle serverless (Vercel), para que
    // db.js consiga aplicar o schema e copiar o banco para /tmp em runtime.
    outputFileTracingIncludes: {
      "/api/**": ["./lib/schema.sql", "./data/canal.db"],
    },
  },
};

export default nextConfig;
