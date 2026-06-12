import { getSession } from "@/lib/auth";
import { Landing } from "@/components/landing/Landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  return <Landing loggedIn={!!session} />;
}
