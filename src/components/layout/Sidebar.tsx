import React from "react";

type NavItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13h8V3H3v10zM3 21h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "cursilhistas", label: "Cursilhistas", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 00-3-3.87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 21v-2a4 4 0 013-3.87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "obreiros", label: "Obreiros", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l2 7h7l-6 4 2 7-5-4-5 4 2-7L3 9h7l2-7z" strokeWidth="1.2"/></svg> },
  { id: "config", label: "Configurações", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z"/><path d="M19.4 15a1.7 1.7 0 00.33 1.82l.06.06a2 2 0 01-2.82 2.82l-.06-.06a1.7 1.7 0 00-1.82-.33 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.28a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.82.33l-.06.06a2 2 0 01-2.82-2.82l.06-.06a1.7 1.7 0 00.33-1.82 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.28a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.33-1.82L4.39 6.4A2 2 0 017.21 3.58l.06.06A1.7 1.7 0 009.09 4a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.28c.3.05.59.2.83.45l.06.06a1.7 1.7 0 001.82.33A1.7 1.7 0 0018.72 4h.28a2 2 0 010 4h-.28c-.3.05-.59.2-.83.45l-.06.06A1.7 1.7 0 0016 10.91" strokeWidth="0.8"/></svg> }
];

type Props = {
  open: boolean;
  collapsed: boolean;
  onClose?: () => void;
  onToggleCollapse: () => void;
};

export default function Sidebar({ open, collapsed, onClose, onToggleCollapse }: Props) {
  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black/40 z-20 transition-opacity lg:hidden ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed z-30 left-0 top-0 bottom-0 w-64 lg:static lg:w-64 transform transition-transform bg-white border-r shadow-sm
          ${open ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-20" : ""}`}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white rounded-md w-8 h-8 flex items-center justify-center font-bold">
                C
              </div>
              {!collapsed && <div className="font-semibold">Cursilho</div>}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleCollapse}
                aria-label="Colapsar menu"
                className="p-1 rounded hover:bg-gray-100"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="lg:hidden">
                {/* mobile close btn */}
                <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.id}>
                  <a
                    href={"#" + item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 text-sm"
                  >
                    <div className="w-6 h-6 text-slate-600">{item.icon}</div>
                    {!collapsed && <span>{item.label}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-3 border-t">
            <button className="w-full text-sm py-2 rounded bg-slate-50 hover:bg-slate-100">Sair</button>
          </div>
        </div>
      </aside>
    </>
  );
}
