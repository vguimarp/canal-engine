import Link from "next/link";
import { AuthShell } from "../../login/page";

export default function ResetSuccessPage() {
  return (
    <AuthShell title="Senha redefinida" subtitle="Sua senha foi atualizada com sucesso.">
      <Link href="/login" className="block text-center bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md">
        Entrar agora
      </Link>
    </AuthShell>
  );
}
