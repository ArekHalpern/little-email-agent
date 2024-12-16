"use client";

import { LogOut, Mail, User } from "lucide-react";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/auth/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const items = [
  {
    title: "Inbox",
    url: "/dashboard",
    icon: Mail,
  },
  // {
  //   title: "Summaries",
  //   url: "/dashboard/summaries",
  //   icon: FileText,
  // },
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: User,
  },
  // {
  //   title: "Settings",
  //   url: "/dashboard/settings",
  //   icon: Settings,
  // },
];

export function AppSidebar() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <SidebarHeader className="hidden md:block sticky top-0 z-10 bg-sidebar">
        <SidebarTrigger className="flex h-8 w-full items-center justify-start pl-[11px]" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="pt-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link
                  href={item.url}
                  className="flex h-8 w-full items-center pl-3"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="ml-2">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Logout"
              className="flex h-8 w-full items-center pl-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </>
  );
}
