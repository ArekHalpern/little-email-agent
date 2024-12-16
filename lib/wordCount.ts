import { Email } from "@/app/dashboard/types";

interface EmailPart {
  mimeType: string;
  body?: {
    data?: string;
  };
}

function decodeBase64(content: string): string {
  try {
    return decodeURIComponent(
      escape(atob(content.replace(/-/g, "+").replace(/_/g, "/")))
    );
  } catch {
    return "";
  }
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

export function getThreadWordCount(threadContext: Email[], currentEmail: Email): number {
  // Count words in thread context
  const threadWords = threadContext.reduce((total, email) => {
    const content = email.payload?.parts?.find(
      (part: EmailPart) => part.mimeType === "text/html" || part.mimeType === "text/plain"
    )?.body?.data || email.payload?.body?.data || "";
    
    const decoded = content ? decodeBase64(content) : "";
    return total + countWords(decoded);
  }, 0);

  // Count words in current email
  const currentEmailContent = currentEmail.payload?.parts?.find(
    (part: EmailPart) => part.mimeType === "text/html" || part.mimeType === "text/plain"
  )?.body?.data || currentEmail.payload?.body?.data || "";
  
  const decodedCurrentEmail = currentEmailContent ? decodeBase64(currentEmailContent) : "";
  return threadWords + countWords(decodedCurrentEmail);
} 