import { getSession } from "@/lib/auth";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const session = await getSession();
    if (!session) return { user: null };
    return {
      user: { id: session.uid, email: session.email, name: session.name },
    };
  });
}
