"use client";

import { Icons } from "./Icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/auth/supabase/client";
import React from "react";

interface GoogleAuthProps {
  mode?: "signup" | "login";
}

export default function GoogleAuth({ mode = "signup" }: GoogleAuthProps) {
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
            next: "/dashboard",
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full h-12 justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
      onClick={handleGoogleSignIn}
    >
      <Icons.google className="mr-2 h-5 w-5" />
      {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
    </Button>
  );
}
