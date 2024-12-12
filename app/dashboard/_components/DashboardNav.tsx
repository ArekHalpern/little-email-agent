"use client";

import * as React from "react";
import { Button } from "../../../components/ui/button";
import { createClient } from "../../../lib/auth/supabase/client";
import { LogOut, Mail, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardNav() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-16 items-center border-b px-4 md:px-6">
      <div className="flex items-center gap-6 md:gap-8">
        <Link href="/dashboard" className="font-bold">
          LEA
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Inbox</span>
            </div>
          </Link>
          <Link
            href="/dashboard/profile"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </div>
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </div>
          </Link>
        </nav>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-sm"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
