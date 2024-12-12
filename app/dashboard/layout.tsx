import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="flex">
        {/* Sidebar can be added here later */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
