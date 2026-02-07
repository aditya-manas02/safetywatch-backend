import {
  Shield,
  List,
  Users,
  Settings,
  LogOut,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";

interface Props {
  active: string;
  onSelect: (tab: string) => void;
  onFilter: (status: string) => void;   // <-- ADDED
  onLogout?: () => void;
}

export default function CyberSidebar({ active, onSelect, onFilter, onLogout }: Props) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Shield },
    { id: "incidents", label: "Incidents", icon: List },
    { id: "users", label: "Users", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-[#0b0f17] to-[#071019] border-r border-gray-800 z-50"
      style={{ boxShadow: "inset 0 0 60px rgba(2,8,23,0.6)" }}
    >
      {/* HEADER */}
      <div className="px-6 py-6 flex items-center gap-3">
        <div
          className="flex items-center justify-center h-10 w-10 rounded bg-gradient-to-tr from-blue-600 to-blue-400"
          style={{ boxShadow: "0 6px 20px rgba(30,144,255,0.18)" }}
        >
          <Shield className="text-white" />
        </div>
        <div>
          <h1 className="text-white text-lg font-extrabold tracking-wide">SafetyWatch</h1>
          <p className="text-xs text-slate-300/70">Admin Console</p>
        </div>
      </div>

      {/* MENU TABS */}
      <nav className="mt-6 px-2">
        {items.map((it) => {
          const activeClass =
            active === it.id
              ? "bg-gradient-to-r from-blue-700/30 border-l-4 border-blue-400 text-white"
              : "text-slate-300 hover:bg-white/5";

          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-md my-1 transition-all duration-150 ${activeClass}`}
            >
              <it.icon
                className={
                  active === it.id ? "text-blue-300" : "text-slate-300"
                }
              />
              <span className="text-sm font-medium">{it.label}</span>
            </button>
          );
        })}
      </nav>

      {/* QUICK FILTERS */}
      <div className="mt-auto px-4 pb-6">

        {/* PENDING */}
        <button
          onClick={() => {
            onSelect("incidents");
            onFilter("pending");
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-white/5"
        >
          <AlertCircle className="text-amber-400" /> Pending
        </button>

        {/* APPROVE / REJECT */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              onSelect("incidents");
              onFilter("approved");
            }}
            className="flex-1 px-3 py-2 rounded-md text-sm bg-green-600/10 text-green-300 hover:bg-green-600/20"
          >
            <CheckCircle className="inline-block mr-2 h-4 w-4" />
            Approved
          </button>

          <button
            onClick={() => {
              onSelect("incidents");
              onFilter("rejected");
            }}
            className="flex-1 px-3 py-2 rounded-md text-sm bg-red-700/10 text-red-300 hover:bg-red-700/20"
          >
            <XCircle className="inline-block mr-2 h-4 w-4" />
            Rejected
          </button>
        </div>

        {/* LOGOUT */}
        <button
          onClick={onLogout}
          className="mt-6 w-full px-3 py-2 bg-[#0b1220] rounded-md text-slate-300 hover:bg-white/5 flex items-center gap-2"
        >
          <LogOut className="text-slate-300" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
