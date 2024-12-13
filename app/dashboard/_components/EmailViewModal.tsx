"use client";

import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Email, EmailViewProps } from "../types";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function EmailViewModal({
  isOpen,
  onClose,
  email,
  thread,
}: EmailViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && email) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, email?.id]);

  const decodeEmailBody = (email: Email) => {
    const htmlPart = email.payload?.parts?.find(
      (part) => part.mimeType === "text/html"
    );
    const plainPart = email.payload?.parts?.find(
      (part) => part.mimeType === "text/plain"
    );

    const body =
      htmlPart?.body?.data ||
      plainPart?.body?.data ||
      email.payload?.body?.data;

    if (!body) return "";

    const decoded = decodeURIComponent(
      escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))
    );

    if (!htmlPart && plainPart) {
      return decoded.replace(/\n/g, "<br>");
    }

    return decoded;
  };

  if (!email) return null;

  const getEmailFrom = (email: Email) => {
    return (
      email.payload?.headers.find((h) => h.name.toLowerCase() === "from")
        ?.value || "Unknown Sender"
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-50 flex flex-col bg-background">
          <div className="flex items-start justify-between p-4 pb-0">
            <div className="space-y-1.5">
              <DialogTitle className="text-lg font-medium leading-none">
                {email.subject}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <span>{getEmailFrom(email)}</span>
                    <span>·</span>
                    <span>
                      {email.internalDate
                        ? new Date(
                            parseInt(email.internalDate)
                          ).toLocaleString()
                        : ""}
                    </span>
                  </div>
                </div>
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
          <div className="px-4 pb-4" />
        </div>

        <div className="px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading content...
                </p>
              </div>
            </div>
          ) : thread ? (
            <div className="space-y-6">
              {thread.messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "border-b pb-6",
                    index === thread.messages.length - 1 && "border-b-0"
                  )}
                >
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert email-content"
                    dangerouslySetInnerHTML={{
                      __html: decodeEmailBody(message),
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none dark:prose-invert email-content"
              dangerouslySetInnerHTML={{
                __html: decodeEmailBody(email),
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
