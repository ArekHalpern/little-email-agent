import React from "react";
import EmailListWrapper from "./_components/email-list-wrapper";

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden">
      <EmailListWrapper />
    </div>
  );
}
