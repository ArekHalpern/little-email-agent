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
        <div className="flex items-center border-b px-4 h-16">
          <SidebarTrigger />
          <Link href="/dashboard" className="ml-4 font-bold text-xl">
            LEA
          </Link>
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}
