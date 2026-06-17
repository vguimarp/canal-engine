import "./globals.css";

export const metadata = {
  title: "Canal Engine — Central de Inteligência",
  description: "Sistema de produção assistida e inteligência para canal de YouTube.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
