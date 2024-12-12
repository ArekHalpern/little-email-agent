"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";
import type { EmailPromptPayload } from "../actions";
import { getCustomerPrompts } from "../actions";
import { createClient } from "@/lib/auth/supabase/client";

interface Email {
  id: string;
  snippet: string;
  threadId?: string;
  payload: {
    headers: {
      name: string;
      value: string;
    }[];
    parts?: {
      mimeType: string;
      body: {
        data?: string;
      };
    }[];
    body?: {
      data?: string;
    };
  };
}

interface EmailThread {
  messages: Email[];
}

export default function EmailList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<{
    email: Email;
    thread?: EmailThread;
  } | null>(null);
  const [prompts, setPrompts] = useState<EmailPromptPayload[]>([]);
  const [processingEmails, setProcessingEmails] = useState<
    Record<string, boolean>
  >({});
  const [emailSummaries, setEmailSummaries] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    fetchEmails();
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const templates = await getCustomerPrompts(session.user.id);
        setPrompts(templates);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    }
  };

  const fetchEmails = async () => {
    try {
      const response = await fetch("/api/gmail/inbox");
      if (!response.ok) throw new Error("Failed to fetch emails");
      const data = await response.json();
      setEmails(data);
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = async (emailId: string) => {
    try {
      const response = await fetch(`/api/gmail/messages/${emailId}`);
      if (!response.ok) throw new Error("Failed to fetch email");
      const data = await response.json();
      setSelectedEmail(data);
    } catch (error) {
      console.error("Error fetching email:", error);
    }
  };

  const getEmailSubject = (email: Email) => {
    return (
      email.payload.headers.find((h) => h.name.toLowerCase() === "subject")
        ?.value || "No Subject"
    );
  };

  const getEmailFrom = (email: Email) => {
    return (
      email.payload.headers.find((h) => h.name.toLowerCase() === "from")
        ?.value || "Unknown Sender"
    );
  };

  const decodeEmailBody = (email: Email) => {
    const htmlPart = email.payload.parts?.find(
      (part) => part.mimeType === "text/html"
    );
    const plainPart = email.payload.parts?.find(
      (part) => part.mimeType === "text/plain"
    );

    const body =
      htmlPart?.body?.data || plainPart?.body?.data || email.payload.body?.data;

    if (!body) return "";

    const decoded = decodeURIComponent(
      escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))
    );

    if (!htmlPart && plainPart) {
      return decoded.replace(/\n/g, "<br>");
    }

    return decoded;
  };

  const processEmail = async (emailId: string, promptId: string) => {
    try {
      setProcessingEmails((prev) => ({ ...prev, [emailId]: true }));

      const email = emails.find((e) => e.id === emailId);
      if (!email) return;

      const emailContent = email.snippet; // Or use the full email content if needed

      const response = await fetch("/api/openai/custom-email-sythesizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailContent, promptId }),
      });

      if (!response.ok) throw new Error("Failed to process email");

      const data = await response.json();
      setEmailSummaries((prev) => ({ ...prev, [emailId]: data.result }));
    } catch (error) {
      console.error("Error processing email:", error);
    } finally {
      setProcessingEmails((prev) => ({ ...prev, [emailId]: false }));
    }
  };

  if (loading) return <div>Loading emails...</div>;

  return (
    <div className="space-y-2 p-4">
      <h2 className="text-xl font-bold mb-6">Inbox</h2>
      {emails.map((email) => (
        <div key={email.id} className="flex gap-4 items-start">
          <div
            className="flex-1 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => handleEmailClick(email.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{getEmailSubject(email)}</h3>
                <p className="text-sm text-gray-600">{getEmailFrom(email)}</p>
                <p className="mt-1 text-sm line-clamp-2">{email.snippet}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Process with{" "}
                    {processingEmails[email.id] && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {prompts.map((prompt) => (
                    <DropdownMenuItem
                      key={prompt.id}
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        processEmail(email.id, prompt.id);
                      }}
                    >
                      {prompt.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {emailSummaries[email.id] && (
            <div className="w-96 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Summary</h4>
              <div className="text-sm whitespace-pre-wrap">
                {emailSummaries[email.id]}
              </div>
            </div>
          )}
        </div>
      ))}

      <Dialog
        open={!!selectedEmail}
        onOpenChange={() => setSelectedEmail(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmail && getEmailSubject(selectedEmail.email)}
            </DialogTitle>
            <div className="text-sm text-gray-500">
              {selectedEmail && getEmailFrom(selectedEmail.email)}
            </div>
          </DialogHeader>

          {selectedEmail?.thread ? (
            <div className="space-y-6">
              {selectedEmail.thread.messages.map((message) => (
                <div key={message.id} className="border-b pb-6">
                  <div className="mb-2">
                    <p className="text-sm font-medium">
                      {getEmailFrom(message)}
                    </p>
                  </div>
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
            selectedEmail && (
              <div
                className="prose prose-sm max-w-none dark:prose-invert email-content"
                dangerouslySetInnerHTML={{
                  __html: decodeEmailBody(selectedEmail.email),
                }}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
