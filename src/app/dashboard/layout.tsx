import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listFoldersForUser } from "@/lib/folders";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const initialFolders = await listFoldersForUser(session.uid);
  const user = {
    id: session.uid,
    email: session.email,
    name: session.name,
  };

  return (
    <DashboardProvider user={user} initialFolders={initialFolders}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </DashboardProvider>
  );
}
