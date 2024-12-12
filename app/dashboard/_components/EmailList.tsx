"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PromptSelector } from "./PromptSelector";
import type { EmailPromptPayload } from "../actions";

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
  const [selectedPrompt, setSelectedPrompt] =
    useState<EmailPromptPayload | null>(null);

  useEffect(() => {
    fetchEmails();
  }, []);

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

  if (loading) return <div>Loading emails...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Inbox</h2>
        {selectedPrompt && (
          <div className="text-sm text-muted-foreground">
            Using prompt: {selectedPrompt.name}
          </div>
        )}
      </div>

      <PromptSelector onPromptSelect={setSelectedPrompt} />

      <div className="space-y-2">
        {emails.map((email) => (
          <div
            key={email.id}
            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => handleEmailClick(email.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{getEmailSubject(email)}</h3>
                <p className="text-sm text-gray-600">{getEmailFrom(email)}</p>
                <p className="mt-1 text-sm">{email.snippet}</p>
              </div>
              {selectedPrompt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Process email with selected prompt
                  }}
                >
                  Process with {selectedPrompt.name}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

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
