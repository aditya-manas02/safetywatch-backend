import {
  Shield,
  LayoutDashboard,
  ListFilter,
  Users as UsersIcon,
  LifeBuoy,
  Activity,
  LogOut,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Megaphone,
  Flag
} from "lucide-react";

interface Props {
  active: string;
  onSelect: (tab: string) => void;
  onFilter: (status: string) => void;
  onLogout?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function CyberSidebar({ active, onSelect, onFilter, onLogout, isOpen, onClose }: Props) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "incidents", label: "Moderation", icon: ListFilter },
    { id: "users", label: "Citizens", icon: UsersIcon },
    { id: "support", label: "Support", icon: LifeBuoy },
    { id: "reports", label: "Reports", icon: Flag },
    { id: "announcements", label: "Broadcast", icon: Megaphone },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <>
      {/* MOBILE BACKDROP */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 shadow-xl transition-transform duration-300 md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* HEADER */}
        <div className="px-6 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-lg shadow-primary/20"
            >
              <div className="h-full w-full rounded-[9px] bg-background flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-foreground text-lg font-black tracking-tight">SafetyWatch</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none mt-0.5">Admin Console</p>
            </div>
          </div>
        </div>

        {/* MENU TABS */}
        <nav className="mt-6 px-2">
          {items.map((it) => {
            const activeClass =
              active === it.id
                ? "bg-primary/10 border-l-4 border-primary text-primary"
                : "text-muted-foreground hover:bg-muted/50";

            return (
              <button
                key={it.id}
                onClick={() => {
                  onSelect(it.id);
                  onClose();
                }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-md my-1 transition-all duration-300 group ${activeClass}`}
              >
                <it.icon
                  className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${active === it.id ? "text-primary" : "text-muted-foreground"}`}
                />
                <span className="text-sm font-medium">{it.label}</span>
              </button>
            );
          })}
        </nav>

        {/* QUICK FILTERS */}
        <div className="mt-auto px-4 pb-6">
          <button
            onClick={() => {
              onSelect("incidents");
              onFilter("pending");
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <AlertCircle className="text-amber-500 h-4 w-4" /> Pending Reports
          </button>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                onSelect("incidents");
                onFilter("approved");
                onClose();
              }}
              className="flex-1 px-3 py-2 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all active:scale-95"
            >
              <CheckCircle2 className="inline-block mr-1.5 h-3.5 w-3.5" />
              Clear
            </button>

            <button
              onClick={() => {
                onSelect("incidents");
                onFilter("rejected");
                onClose();
              }}
              className="flex-1 px-3 py-2 rounded-md text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-95"
            >
              <XCircle className="inline-block mr-1.5 h-3.5 w-3.5" />
              Spam
            </button>
          </div>

          {/* LOGOUT */}
          <button
            onClick={onLogout}
            className="mt-6 w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-rose-500 transition-colors" />
              <span className="text-xs font-black tracking-widest uppercase">Sign out</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>
    </>
  );
}
