"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/auth/supabase/client";
import { Shield } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@supabase/supabase-js";

interface CustomerData {
  id: string;
  email: string;
  name: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        const response = await fetch(`/api/customers/${user.id}`);
        if (response.ok) {
          const customerData = await response.json();
          setCustomer(customerData);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleGoogleReconnect = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?provider=google`,
        scopes:
          "email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
        queryParams: {
          access_type: "offline",
          prompt: "consent select_account",
          response_type: "code",
        },
      },
    });

    if (error) {
      console.error("Auth error:", error);
    } else if (data.url) {
      window.location.href = data.url;
    }
  };

  return (
    <div className="flex justify-center min-h-screen bg-background">
      <div className="w-full max-w-4xl py-8 space-y-8 px-4">
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>{user?.email?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {user?.user_metadata?.full_name || "Your Profile"}
            </h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Email Processing Settings</CardTitle>
              <CardDescription>
                Manage your Gmail connection and email processing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <h3 className="font-medium">Gmail Connection</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {customer?.google_access_token
                      ? "Connected to Gmail"
                      : "Not connected to Gmail"}
                  </p>
                  {customer?.google_token_expiry && (
                    <p className="text-xs text-muted-foreground">
                      Token expires:{" "}
                      {new Date(customer.google_token_expiry).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  variant={
                    customer?.google_access_token ? "outline" : "default"
                  }
                  onClick={handleGoogleReconnect}
                >
                  {customer?.google_access_token
                    ? "Reconnect"
                    : "Connect Gmail"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
