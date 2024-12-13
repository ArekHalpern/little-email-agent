"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const EmailList = dynamic(() => import("./EmailList"), {
  ssr: false,
});

export default function EmailListWrapper() {
  const router = useRouter();

  const handleEmailSelect = (emailId: string) => {
    router.push(`/dashboard/summaries/${emailId}`);
  };

  return <EmailList onEmailSelect={handleEmailSelect} />;
}
