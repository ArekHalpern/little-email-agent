"use client";

import dynamic from "next/dynamic";

const EmailList = dynamic(() => import("./EmailList"), {
  ssr: false,
});

export default function EmailListWrapper() {
  return <EmailList />;
}
