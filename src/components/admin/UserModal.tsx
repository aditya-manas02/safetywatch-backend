import { X, Shield, Mail, Calendar, Phone, Trash2, Award, UserCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { User, Incident } from "@/types";

export interface UserModalProps {
  user: User | null;
  incidents: Incident[];
  onClose: () => void;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function UserModal({
  user,
  incidents,
  onClose,
  onPromote,
  onDemote,
  onDelete
}: UserModalProps) {
  if (!user) return null;

  let isSuperAdmin = false;
  let loggedInUserId: string | null = null;

  try {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isSuperAdmin = payload?.roles?.includes("superadmin");
      loggedInUserId = payload?.id;
    }
  } catch {
    isSuperAdmin = false;
    loggedInUserId = null;
  }

  const isSelf = loggedInUserId === user._id;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0b1220] border border-gray-800 rounded-3xl p-0 max-w-2xl w-full max-h-[90vh] overflow-hidden relative shadow-2xl"
      >
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
          <button className="absolute right-6 top-6 h-10 w-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-colors" onClick={onClose}>
            <X className="text-white h-5 w-5" />
          </button>
        </div>

        <div className="px-8 pb-8 -mt-12">
          <div className="flex justify-between items-end mb-8">
            <div className="h-24 w-24 rounded-3xl bg-[#0b1220] border-4 border-[#0b1220] shadow-xl flex items-center justify-center">
              <div className="h-full w-full rounded-2xl bg-primary flex items-center justify-center">
                <Shield className="h-10 w-10 text-white" />
              </div>
            </div>

            <div className="flex gap-2">
              {user.roles.map((r: string) => (
                <Badge key={r} className="capitalize bg-blue-500/20 text-blue-400 border-none px-3 font-black tracking-widest text-[10px]">
                  {r}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{user.name || "Verified Citizen"}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-slate-400 text-sm flex items-center gap-1.5"><Mail className="h-4 w-4" /> {user.email}</span>
                {user.phone && <span className="text-slate-400 text-sm flex items-center gap-1.5"><Phone className="h-4 w-4" /> {user.phone}</span>}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-gray-800 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Joined SafetyWatch</p>
                <p className="font-bold text-slate-200">{(() => { try { return format(new Date(user.createdAt), "MMMM dd, yyyy"); } catch { return "N/A"; } })()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Contributions</p>
                <p className="font-bold text-slate-200">{incidents.length} Incident Reports</p>
              </div>
            </div>

            {/* ACTION CENTER */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Privilege Management</h4>
              <div className="flex gap-3 flex-wrap">
                {!user.roles.includes("admin") && (
                  <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl" onClick={() => onPromote(user._id)}>
                    <Award className="mr-2 h-4 w-4" /> Promote to Admin
                  </Button>
                )}

                {user.roles.includes("admin") && isSuperAdmin && !isSelf && (
                  <Button variant="outline" className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10 rounded-xl" onClick={() => onDemote(user._id)}>
                    <UserCheck className="mr-2 h-4 w-4" /> Demote to User
                  </Button>
                )}

                {isSuperAdmin && !isSelf && (
                  <Button variant="destructive" className="rounded-xl" onClick={() => { if (window.confirm("Permanently delete user profile?")) onDelete(user._id); }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remove Profile
                  </Button>
                )}

                {isSelf && (
                  <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <p className="text-xs text-amber-200/80 font-medium">Self-Protection Active: You cannot modify your own administrative privileges.</p>
                  </div>
                )}
              </div>
            </div>

            {/* CONTRIBUTION TIMELINE */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Submission History</h4>
              {incidents.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-gray-800 bg-slate-900/20">
                  <p className="text-slate-500 text-sm">No recent incidents recorded.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {incidents.map((i: Incident) => (
                    <div key={i._id} className="p-4 bg-slate-900/80 rounded-2xl border border-gray-800 flex justify-between items-center group hover:border-primary/50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-100">{i.title}</p>
                        <p className="text-[10px] text-slate-500">{(() => { try { return format(new Date(i.createdAt), "Pp"); } catch { return "N/A"; } })()}</p>
                      </div>
                      <Badge className={`capitalize py-0.5 px-2 text-[10px] font-black border-none ${i.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {i.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
