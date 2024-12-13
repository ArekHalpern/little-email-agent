interface EmailSummaryPanelProps {
  summary: string | null;
  emailSubject?: string;
}

export function EmailSummaryPanel({
  summary,
  emailSubject,
}: EmailSummaryPanelProps) {
  if (!summary) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select an email and process it to see the summary here</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {emailSubject && (
        <div className="pb-4 border-b">
          <h3 className="font-medium">Summary for: {emailSubject}</h3>
        </div>
      )}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {summary}
      </div>
    </div>
  );
}
