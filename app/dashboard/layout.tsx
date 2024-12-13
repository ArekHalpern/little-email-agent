import { cookies } from "next/headers";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  Sidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex min-h-svh w-full">
        <Sidebar variant="inset" collapsible="icon">
          <AppSidebar />
        </Sidebar>
        <SidebarInset className="relative flex min-h-svh flex-1 flex-col bg-background">
          <header className="flex h-16 items-center bg-background px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
