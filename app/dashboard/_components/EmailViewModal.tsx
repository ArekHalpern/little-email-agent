"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Email, EmailThread } from "../types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { emailCache } from "@/lib/cache";
import { EmailCacheData } from "@/lib/cache";

function getEmailSubject(email: Email) {
  return (
    email.payload?.headers.find((h) => h.name.toLowerCase() === "subject")
      ?.value || "No Subject"
  );
}

function getEmailFrom(email: Email) {
  return (
    email.payload?.headers.find((h) => h.name.toLowerCase() === "from")
      ?.value || "Unknown Sender"
  );
}

function getEmailBody(email: Email) {
  const htmlPart = email.payload?.parts?.find(
    (part) => part.mimeType === "text/html"
  );
  const plainPart = email.payload?.parts?.find(
    (part) => part.mimeType === "text/plain"
  );

  const body =
    htmlPart?.body?.data || plainPart?.body?.data || email.payload?.body?.data;

  if (!body) return "";

  const decoded = decodeURIComponent(
    escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))
  );

  if (!htmlPart && plainPart) {
    return decoded.replace(/\n/g, "<br>");
  }

  return decoded;
}

export function EmailViewModal({
  isOpen,
  onClose,
  email,
}: {
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
  thread?: EmailThread;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [emailData, setEmailData] = useState<Email | null>(null);
  const [threadData, setThreadData] = useState<EmailThread | undefined>();

  useEffect(() => {
    if (isOpen && email) {
      setIsLoading(true);
      // Reset states when modal opens
      setEmailData(null);
      setThreadData(undefined);

      const fetchThread = async () => {
        try {
          // Check cache first
          const cacheKey = `email:${email.id}`;
          const cachedData = emailCache.get(cacheKey) as EmailCacheData;

          if (cachedData?.email && cachedData?.thread) {
            setEmailData(cachedData.email);
            setThreadData(cachedData.thread);
            setIsLoading(false);
            return;
          }

          const response = await fetch(`/api/gmail/messages/${email.id}`);
          if (!response.ok) throw new Error("Failed to fetch thread");
          const data = await response.json();

          // Cache the response
          emailCache.set(cacheKey, {
            email: data.email,
            thread: data.thread,
          });

          setEmailData(data.email);
          setThreadData(data.thread);
        } catch (error) {
          console.error("Error fetching thread:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchThread();
    }
  }, [isOpen, email]);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          {emailData ? getEmailSubject(emailData) : "Email View"}
        </DialogTitle>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {emailData && (
              <>
                <h2 className="text-xl font-semibold mb-4">
                  {getEmailSubject(emailData)}
                </h2>
                {threadData ? (
                  <div className="space-y-6">
                    {threadData.messages.map((message) => (
                      <div
                        key={message.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{getEmailFrom(message)}</span>
                          <span>
                            {message.internalDate &&
                              new Date(
                                parseInt(message.internalDate)
                              ).toLocaleString()}
                          </span>
                        </div>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: getEmailBody(message),
                          }}
                          className="prose dark:prose-invert max-w-none"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{getEmailFrom(emailData)}</span>
                      <span>
                        {emailData.internalDate &&
                          new Date(
                            parseInt(emailData.internalDate)
                          ).toLocaleString()}
                      </span>
                    </div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: getEmailBody(emailData),
                      }}
                      className="prose dark:prose-invert max-w-none"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper functions remain the same...
