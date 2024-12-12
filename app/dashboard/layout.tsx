import React from "react";
import DashboardNav from "./_components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNav />
      <main className="flex-1 container mx-auto p-8">{children}</main>
    </div>
  );
}
