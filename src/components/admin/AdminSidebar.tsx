import { useState } from "react";
import { Shield, AlertCircle, CheckCircle, XCircle, List, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  active: string;
  onSelect: (value: string) => void;
}

export default function AdminSidebar({ active, onSelect }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Shield },
    { id: "pending", label: "Pending", icon: AlertCircle },
    { id: "approved", label: "Approved", icon: CheckCircle },
    { id: "rejected", label: "Rejected", icon: XCircle },
    { id: "all", label: "All Incidents", icon: List },
  ];

  return (
    <div
      className={`h-screen bg-gray-900 border-r border-gray-700 text-gray-200
      transition-all duration-300 fixed md:relative
      ${collapsed ? "w-16" : "w-56"}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && <h1 className="text-lg font-bold">Admin Panel</h1>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
          <Menu className="text-gray-300" />
        </Button>
      </div>

      <div className="mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-3 w-full px-4 py-3
              hover:bg-gray-800 transition
              ${active === item.id ? "bg-gray-800 border-l-4 border-blue-500" : ""}
            `}
          >
            <item.icon className="text-gray-300" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
