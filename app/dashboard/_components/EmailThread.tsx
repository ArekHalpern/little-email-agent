import { Email } from "@/app/dashboard/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function getEmailBody(email: Email): string {
  if (!email) return "";
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

interface EmailThreadProps {
  emails: Email[];
  className?: string;
}

export function EmailThread({ emails, className }: EmailThreadProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {emails.map((email, index) => (
        <div
          key={email.id}
          className={cn(
            "relative pl-6 border-l-2",
            index === 0 ? "border-primary" : "border-muted"
          )}
        >
          {/* Email metadata */}
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="font-medium">{email.from}</span>
              <span className="text-sm text-muted-foreground ml-2">
                {email.internalDate &&
                  format(
                    new Date(parseInt(email.internalDate)),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
              </span>
            </div>
            {index === 0 && (
              <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                Latest
              </div>
            )}
          </div>

          {/* Email content */}
          <div className="prose dark:prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{
                __html: getEmailBody(email),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
