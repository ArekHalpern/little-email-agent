"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">You&apos;ve Got Lea</h1>
      <p className="text-muted-foreground text-lg text-center max-w-2xl">
        Your personal email assistant that helps you manage and organize your
        emails efficiently.
      </p>
      <Button asChild size="lg" className="mt-4">
        <Link href="/dashboard/inbox" className="gap-2">
          <Mail className="h-5 w-5" />
          Go to Inbox
        </Link>
      </Button>
    </div>
  );
}
