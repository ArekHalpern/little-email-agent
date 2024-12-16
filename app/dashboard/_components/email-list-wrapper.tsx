"use client";

import dynamic from "next/dynamic";

const EmailList = dynamic(() => import("./EmailList"), {
  ssr: false,
});

export default function EmailListWrapper({
  onReply,
}: {
  onReply?: (emailId: string) => void;
}) {
  return <EmailList onReply={onReply} />;
}
