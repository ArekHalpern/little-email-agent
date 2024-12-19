"use client";

import { LogOut, Mail, User, Home, ChevronsUpDown, Plus } from "lucide-react";
import {
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  Sidebar,
  useSidebar,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/auth/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/app/(auth)/_components/Icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
    items: [
      {
        title: "Overview",
        url: "/dashboard",
      },
      {
        title: "Analytics",
        url: "/dashboard/analytics",
      },
    ],
  },
  {
    title: "Inbox",
    url: "/dashboard/inbox",
    icon: Mail,
    items: [
      {
        title: "All Mail",
        url: "/dashboard/inbox",
      },
      {
        title: "Sent",
        url: "/dashboard/inbox/sent",
      },
    ],
  },
  {
    title: "Connect",
    url: "/dashboard/connect",
    icon: User,
    items: [
      {
        title: "Accounts",
        url: "/dashboard/connect",
      },
      {
        title: "Settings",
        url: "/dashboard/connect/settings",
      },
    ],
  },
];

interface UserAccount {
  email: string;
  id: string;
}

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(
    null
  );
  const { isMobile } = useSidebar();

  useEffect(() => {
    const fetchAccounts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setAccounts([{ email: user.email, id: user.id }]);
        setCurrentAccount({ email: user.email, id: user.id });
      }
    };
    fetchAccounts();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2 border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Icons.google className="h-4 w-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {currentAccount?.email}
                    </span>
                    <span className="truncate text-xs">Free Plan</span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Accounts
                </DropdownMenuLabel>
                {accounts.map((account) => (
                  <DropdownMenuItem key={account.id} className="gap-2 p-2">
                    <Icons.google className="h-4 w-4 shrink-0" />
                    {account.email}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">
                    Add account
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="p-2">
          {items.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className="h-9"
                >
                  <Link href={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="pb-2">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Logout"
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center">
                <LogOut className="h-4 w-4 shrink-0" />
              </div>
              <span className="flex-1 text-left text-sm truncate">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
