import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const API_BASE = "http://localhost:4000/api";

export default function CommunityGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/groups`);
      setGroups(await res.json());
    } catch (err) {
      console.error(err);
      toast({ title: "Error loading groups", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function createGroup() {
    if (!user) return toast({ title: "Sign in to create", variant: "destructive" });
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description: desc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      toast({ title: "Group created" });
      setName(""); setDesc("");
      load();
    } catch (err:any) {
      console.error(err);
      toast({ title: err.message || "Error", variant: "destructive" });
    } finally { setCreating(false); }
  }

  async function join(id:string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/groups/${id}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` }});
      if (!res.ok) throw await res.json();
      toast({ title: "Joined group" });
      load();
    } catch (err:any) {
      console.error(err);
      toast({ title: err.message || "Error joining", variant: "destructive" });
    }
  }

  async function leave(id:string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/groups/${id}/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` }});
      if (!res.ok) throw await res.json();
      toast({ title: "Left group" });
      load();
    } catch (err:any) {
      console.error(err);
      toast({ title: err.message || "Error leaving", variant: "destructive" });
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Community Watch Groups</h3>

      <div className="mb-4">
        <input className="w-full p-2 border rounded mb-2" placeholder="Group name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="w-full p-2 border rounded mb-2" placeholder="Short description" value={desc} onChange={(e)=>setDesc(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={createGroup} disabled={creating}>{creating ? "Creating..." : "Create Group"}</Button>
        </div>
      </div>

      <div>
        {loading ? <p>Loading groups...</p> : groups.length === 0 ? <p>No groups yet.</p> :
          <ul className="space-y-3">
            {groups.map(g => (
              <li key={g._id} className="border p-3 rounded flex justify-between items-start">
                <div>
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-sm text-slate-500">{g.description}</div>
                  <div className="text-xs text-slate-400 mt-1">Members: {g.members?.length ?? "-"}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button variant="ghost" onClick={()=> window.location.href = `/groups/${g._id}`}>View</Button>
                  {user && (g.members || []).some((m:any) => m === user.id || m._id === user.id) ? (
                    <Button variant="destructive" onClick={() => leave(g._id)}>Leave</Button>
                  ) : (
                    <Button onClick={() => join(g._id)}>Join</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        }
      </div>
    </div>
  );
}
