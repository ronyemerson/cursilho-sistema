import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // collapsed on large screens

  const toggleSidebar = () => setOpen((v) => !v);
  const closeSidebar = () => setOpen(false);
  const toggleCollapse = () => setCollapsed((v) => !v);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar open={open} collapsed={collapsed} onClose={closeSidebar} onToggleCollapse={toggleCollapse} />
      <div className="flex-1 flex flex-col min-h-screen lg:pl-0">
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
