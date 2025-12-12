// src/pages/Admin.tsx

import DashboardStats from "@/components/admin/DashboardStats";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Shield, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// components
import CyberSidebar from "@/components/admin/CyberSidebar";
import CyberIncidentTable from "@/components/admin/CyberIncidentTable";
import CyberIncidentModal from "@/components/admin/CyberIncidentModal";
import UserTable from "@/components/admin/UserTable";
import UserModal from "@/components/admin/UserModal";

export default function Admin() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userIncidents, setUserIncidents] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate("/");
  }, [user, isAdmin, isLoading]);

  /* ---------------- FETCH ON TAB SWITCH ---------------- */
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "incidents") fetchIncidents();
    if (activeTab === "users") fetchUsers();
  }, [activeTab, isAdmin]);

  /* ---------------- FILTER INCIDENTS ---------------- */
  useEffect(() => {
    let f = [...incidents];

    if (query.trim()) {
      const q = query.toLowerCase();
      f = f.filter(
        (i) =>
          (i.title || "").toLowerCase().includes(q) ||
          (i.location || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") f = f.filter((i) => i.status === statusFilter);
    if (typeFilter !== "all") f = f.filter((i) => i.type === typeFilter);

    setFilteredIncidents(f);
  }, [incidents, loadingIncidents, query, statusFilter, typeFilter]);

  /* ---------------- FETCH INCIDENTS ---------------- */
  async function fetchIncidents() {
    setLoadingIncidents(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/incidents", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      const cleaned = data.map((i: any) => ({
        _id: i._id,
        title: i.title,
        type: i.type,
        location: i.location,
        description: i.description,
        status: i.status,
        createdAt: i.createdAt,
        imageUrl: i.imageUrl ?? null,
        latitude: i.latitude,
        longitude: i.longitude,
        userId: i.userId,
      }));

      setIncidents(cleaned);
    } catch {
      toast({ title: "Error loading incidents", variant: "destructive" });
    } finally {
      setLoadingIncidents(false);
    }
  }

  /* ---------------- DELETE INCIDENT (APPROVED ONLY) ---------------- */
  async function deleteIncident(id: string) {
    if (!window.confirm("Are you sure you want to delete this incident?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:4000/api/incidents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      toast({
        title: "Incident deleted",
        description: data.message || "The incident was removed successfully.",
      });

      fetchIncidents();
      setSelectedIncident(null);
    } catch (err) {
      toast({ title: "Error deleting incident", variant: "destructive" });
    }
  }

  /* ---------------- UPDATE STATUS ---------------- */
  async function updateIncidentStatus(id: string, status: "approved" | "rejected") {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4000/api/incidents/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.message || "Failed to update status",
          variant: "destructive",
        });
        return;
      }

      toast({ title: `Incident ${status}` });
      fetchIncidents();
      setSelectedIncident(null);
    } catch {
      toast({ title: "Error updating incident", variant: "destructive" });
    }
  }

  /* ---------------- USERS SECTION ---------------- */
  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(await res.json());
    } catch {
      toast({ title: "Error loading users", variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchUserIncidents(id: string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4000/api/users/${id}/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserIncidents(await res.json());
    } catch {
      toast({ title: "Error loading user incidents", variant: "destructive" });
    }
  }

  async function promoteUser(id: string) {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:4000/api/users/${id}/promote`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "User promoted to Admin" });
      fetchUsers();
      fetchUserIncidents(id);
    } catch {
      toast({ title: "Error promoting user", variant: "destructive" });
    }
  }

  async function demoteUser(id: string) {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:4000/api/users/${id}/demote`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Admin role removed" });
      fetchUsers();
      fetchUserIncidents(id);
    } catch {
      toast({ title: "Error demoting user", variant: "destructive" });
    }
  }

  async function deleteUser(id: string) {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:4000/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({ title: "User deleted" });
      setSelectedUser(null);
      fetchUsers();
    } catch {
      toast({ title: "Error deleting user", variant: "destructive" });
    }
  }

  /* ---------------- EXIT ADMIN ---------------- */
  function exitAdmin() {
    navigate("/");
  }

  /* ---------------- LOADING STATE ---------------- */
  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-[#05070b] text-slate-200 flex">
      <CyberSidebar
        active={activeTab}
        onSelect={setActiveTab}
        onFilter={setStatusFilter}
        onLogout={() => {
          localStorage.removeItem("token");
          navigate("/");
        }}
      />

      <div className="ml-64 flex-1">
        <header className="bg-gradient-to-b from-[#071021] to-[#03040a] px-8 py-6 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded">
              <Shield className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Admin Control Panel</h1>
              <p className="text-slate-400 text-sm">CyberDark Neon Dashboard</p>
            </div>
          </div>

          <button onClick={exitAdmin} className="px-4 py-2 bg-red-600 text-white rounded-md">
            Exit Admin Panel
          </button>
        </header>

        <main className="p-8">
          {activeTab === "dashboard" && <DashboardStats />}

          {/* INCIDENTS TAB */}
          {activeTab === "incidents" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search incidents..."
                    className="pl-10 pr-4 py-2 bg-[#071328] border border-gray-800 rounded-md text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-400" />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#071328] border border-gray-800 px-3 py-2 rounded text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-[#071328] border border-gray-800 px-3 py-2 rounded text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="theft">Theft</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="assault">Assault</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {loadingIncidents ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                </div>
              ) : (
                <CyberIncidentTable
                  incidents={filteredIncidents}
                  onView={(i) => setSelectedIncident(i)}
                  onDelete={deleteIncident} // ⭐ ADDED
                />
              )}
            </>
          )}

          {/* USERS TAB */}
          {activeTab === "users" && (
            <>
              {loadingUsers ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                </div>
              ) : (
                <UserTable
                  users={users}
                  onView={(u) => {
                    setSelectedUser(u);
                    fetchUserIncidents(u._id);
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}
      {selectedIncident && (
        <CyberIncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onApprove={(id) => updateIncidentStatus(id, "approved")}
          onReject={(id) => updateIncidentStatus(id, "rejected")}
          onDelete={deleteIncident} // ⭐ ADDED
        />
      )}

      {selectedUser && (
        <UserModal
          user={selectedUser}
          incidents={userIncidents}
          onClose={() => setSelectedUser(null)}
          onPromote={promoteUser}
          onDemote={demoteUser}
          onDelete={deleteUser}
        />
      )}
    </div>
  );
}
