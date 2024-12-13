"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface EmailSummaryPanelProps {
  summary: string | null;
  emailId: string;
  emailSubject?: string;
  onSaveSummary?: (summary: string) => Promise<void>;
}

export function EmailSummaryPanel({
  summary: initialSummary,
  emailSubject,
  onSaveSummary,
}: EmailSummaryPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(initialSummary || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!initialSummary && !emailSubject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select an email to view its summary</p>
      </div>
    );
  }

  if (!initialSummary && emailSubject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Use the menu options to process this email and generate a summary</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!onSaveSummary) return;
    setIsSaving(true);
    try {
      await onSaveSummary(summary);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {emailSubject && (
        <div className="pb-4 border-b flex justify-between items-center">
          <h3 className="font-medium">Summary for: {emailSubject}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </div>
      )}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[200px]"
            />
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          summary
        )}
      </div>
    </div>
  );
}
