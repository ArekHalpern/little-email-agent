import { Email } from "../types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface EmailThreadProps {
  emails: Email[];
  className?: string;
}

function getEmailBody(email: Email): string {
  const htmlPart = email.payload?.parts?.find(
    (part) => part.mimeType === "text/html"
  );
  const plainPart = email.payload?.parts?.find(
    (part) => part.mimeType === "text/plain"
  );

  let body = "";

  // Try to get the body content from various possible locations
  if (htmlPart?.body?.data) {
    body = htmlPart.body.data;
  } else if (plainPart?.body?.data) {
    body = plainPart.body.data;
  } else if (email.payload?.body?.data) {
    body = email.payload.body.data;
  } else if (email.payload?.parts?.[0]?.body?.data) {
    // Sometimes the first part contains the main content
    body = email.payload.parts[0].body.data;
  }

  if (!body) return "";

  const decoded = decodeURIComponent(
    escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))
  );

  // Clean up the formatting regardless of content type
  return (
    decoded
      // Handle div containers
      .replace(/<div[^>]*>(.*?)<\/div>/gi, "$1\n")
      // Remove empty paragraphs and divs
      .replace(/<(p|div)>\s*<\/(p|div)>/gi, "")
      // Convert paragraphs to newlines with content
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
      // Handle blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "\n$1\n")
      // Convert breaks to newlines
      .replace(/<br\s*\/?>/gi, "\n")
      // Handle lists
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "• $1\n")
      // Remove all other HTML tags
      .replace(/<[^>]*>/g, "")
      // Replace common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      // Clean up whitespace
      .replace(/\n\s*\n/g, "\n\n")
      .replace(/^\s+|\s+$/g, "")
      // Fix any remaining encoded spaces or newlines
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "    ")
  );
}

function getEmailFrom(email: Email): string {
  return (
    email.payload.headers.find((h) => h.name.toLowerCase() === "from")?.value ||
    "Unknown Sender"
  );
}

function getEmailDate(email: Email): string {
  const timestamp = parseInt(email.internalDate || "0");
  return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
}

export function EmailThread({ emails, className }: EmailThreadProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {emails.map((email, index) => (
        <div
          key={email.id}
          className={cn(
            "rounded-lg border bg-card text-card-foreground shadow-sm",
            index === 0 && "bg-primary/5"
          )}
        >
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{getEmailFrom(email)}</span>
                <span className="text-sm text-muted-foreground">
                  {getEmailDate(email)}
                </span>
              </div>
            </div>
            <div className="mt-4 text-sm whitespace-pre-wrap">
              {getEmailBody(email)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
