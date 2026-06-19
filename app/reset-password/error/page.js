import Link from "next/link";
import { AuthShell } from "../../login/page";

export default function ResetErrorPage() {
  return (
    <AuthShell title="Link inválido" subtitle="O link pode ter expirado ou já ter sido usado.">
      <Link href="/forgot-password" className="block text-center bg-amber text-paper text-sm font-bold uppercase tracking-wide py-2.5 rounded-md">
        Pedir novo link
      </Link>
    </AuthShell>
  );
}
