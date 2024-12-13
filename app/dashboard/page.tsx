import React from "react";
import EmailListWrapper from "./_components/email-list-wrapper";

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="h-screen max-h-screen overflow-hidden">
      <EmailListWrapper />
    </div>
  );
}
