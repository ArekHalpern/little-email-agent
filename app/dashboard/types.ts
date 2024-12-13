export interface EmailHeader {
  name: string;
  value: string;
}

export interface Email {
  id: string;
  subject?: string;
  from?: string;
  snippet: string;
  threadId?: string;
  internalDate?: string;
  payload: {
    headers: EmailHeader[];
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

export interface EmailThread {
  messages: Email[];
}

export interface EmailViewProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
  thread?: EmailThread;
} 