import { cookies } from "next/headers";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/app-sidebar";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <main className="flex-1">
        <div className="fixed top-0 right-0 left-0 flex items-center border-b bg-background px-4 h-16 z-10 md:left-[--sidebar-width] peer-data-[state=collapsed]:md:left-0">
          <SidebarTrigger />
          <Link href="/dashboard" className="ml-4 font-bold text-xl">
            LEA
          </Link>
        </div>
        <div className="pt-16">{children}</div>
      </main>
    </SidebarProvider>
  );
}
