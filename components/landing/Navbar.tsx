"use client";

import Link from "next/link";
import { createClient } from "@/lib/auth/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return (
    <nav className="fixed w-full backdrop-blur-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl">
              LEA
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/features" className="hover:text-primary px-3 py-2">
                Features
              </Link>
              <Link href="/pricing" className="hover:text-primary px-3 py-2">
                Pricing
              </Link>
              <Link href="/blog" className="hover:text-primary px-3 py-2">
                Blog
              </Link>
            </div>
          </div>
          <div className="hidden md:flex gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
