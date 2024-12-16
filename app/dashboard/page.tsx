"use client";

import React, { useState } from "react";
import EmailListWrapper from "./_components/email-list-wrapper";
import { Composer } from "./_components/Composer";
import { Button } from "@/components/ui/button";
import { PenSquare } from "lucide-react";

export default function DashboardPage(): React.JSX.Element {
  const [isComposing, setIsComposing] = useState(false);

  return (
    <div className="h-full w-full flex flex-col min-w-0 overflow-hidden relative">
      <EmailListWrapper />

      {/* Floating Compose Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 px-6 gap-2 shadow-lg"
        onClick={() => setIsComposing(true)}
      >
        <PenSquare className="h-5 w-5" />
        Compose
      </Button>

      {isComposing && (
        <Composer emailId={null} onClose={() => setIsComposing(false)} />
      )}
    </div>
  );
}
