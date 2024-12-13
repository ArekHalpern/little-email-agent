import { cookies } from "next/headers";
import {
  SidebarProvider,
  SidebarInset,
  Sidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/app-sidebar";
import { Menu } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar variant="inset" collapsible="icon" className="h-screen">
          <AppSidebar />
        </Sidebar>
        <SidebarInset className="flex h-screen flex-1 flex-col bg-background">
          <div className="flex h-12 items-center bg-background px-4 border-b md:hidden">
            <SidebarTrigger className="h-8 w-8 p-0">
              <Menu className="h-4 w-4" />
            </SidebarTrigger>
          </div>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
