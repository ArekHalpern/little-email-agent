"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface EmailHeader {
  name: string;
  value: string;
}

interface Email {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  threadId?: string;
}

interface Summary {
  id: string;
  emailId: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export default function SummaryPage() {
  const params = useParams();
  const emailId = params.id as string;

  const [email, setEmail] = useState<Email | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch email details
        const emailResponse = await fetch(`/api/gmail/messages/${emailId}`);
        if (!emailResponse.ok) throw new Error("Failed to fetch email");
        const emailData = await emailResponse.json();

        const email = {
          id: emailData.email.id,
          subject:
            emailData.email.payload.headers.find(
              (h: EmailHeader) => h.name.toLowerCase() === "subject"
            )?.value || "No Subject",
          from:
            emailData.email.payload.headers.find(
              (h: EmailHeader) => h.name.toLowerCase() === "from"
            )?.value || "Unknown Sender",
          snippet: emailData.email.snippet,
          threadId: emailData.email.threadId,
        };
        setEmail(email);

        // Fetch summary if it exists
        const summaryResponse = await fetch(
          `/api/email-summaries?emailId=${emailId}`
        );
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
          setEditedSummary(summaryData?.summary || "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [emailId]);

  const handleSaveSummary = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/email-summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId,
          summary: editedSummary,
        }),
      });

      if (!response.ok) throw new Error("Failed to save summary");

      const updatedSummary = await response.json();
      setSummary(updatedSummary);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save summary");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Subject</h3>
              <p>{email?.subject}</p>
            </div>
            <div>
              <h3 className="font-medium">From</h3>
              <p>{email?.from}</p>
            </div>
            <div>
              <h3 className="font-medium">Preview</h3>
              <p className="text-muted-foreground">{email?.snippet}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Summary</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (isEditing) {
                setEditedSummary(summary?.summary || "");
              }
              setIsEditing(!isEditing);
            }}
          >
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="min-h-[200px]"
                placeholder="Enter your summary..."
              />
              <Button onClick={handleSaveSummary} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">
              {summary?.summary || "No summary available yet"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
