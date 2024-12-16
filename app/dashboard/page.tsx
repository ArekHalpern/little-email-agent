import React from "react";
import EmailListWrapper from "./_components/email-list-wrapper";

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="h-full w-full flex flex-col min-w-0 overflow-hidden">
      <EmailListWrapper />
    </div>
  );
}
