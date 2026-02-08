// src/components/admin/CyberIncidentTable.tsx
import { format } from "date-fns";
import { Eye, Trash2, Download, CheckSquare, XSquare, Square, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Incident } from "@/types";

export interface CyberIncidentTableProps {
  incidents: Incident[];
  onView: (incident: Incident) => void;
  onDelete: (id: string) => void;
  onBulkUpdate: (ids: string[], status: string, isImportant?: boolean) => void;
}

export default function CyberIncidentTable({
  incidents = [],
  onView,
  onDelete,
  onBulkUpdate
}: CyberIncidentTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === incidents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(incidents.map((i: Incident) => i._id));
    }
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Title", "Type", "Location", "Description", "Status", "Date"];
    const rows = incidents.map((i: Incident) => [
      i._id,
      `"${i.title}"`,
      i.type,
      `"${i.location}"`,
      `"${i.description?.replace(/\n/g, " ")}"`,
      i.status,
      (() => { try { return format(new Date(i.createdAt), "yyyy-MM-dd HH:mm"); } catch { return "N/A"; } })()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `safetywatch_incidents_${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkAction = async (status: string, isImportant?: boolean) => {
    if (!onBulkUpdate) return;
    await onBulkUpdate(selectedIds, status, isImportant);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="border-border/50 hover:bg-muted/50"
          >
            {selectedIds.length === incidents.length && incidents.length > 0 ? (
              <CheckSquare className="mr-2 h-4 w-4 text-primary" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            {selectedIds.length > 0 ? `Selected ${selectedIds.length}` : "Select All"}
          </Button>

          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 pl-4 border-l border-gray-800"
              >
                <Button
                  size="sm"
                  onClick={() => handleBulkAction('approved')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('', true)}
                  className="border-border/50 hover:bg-muted/50"
                >
                  <Square className="mr-2 h-4 w-4 text-orange-500 fill-orange-500" /> Star
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('rejected')}
                >
                  <XSquare className="mr-2 h-4 w-4" /> Reject
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button variant="ghost" size="sm" onClick={handleExportCSV} className="text-muted-foreground hover:text-foreground">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-card border border-border/50 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 w-12"></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Image</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Details</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/30">
              {incidents.map((inc: Incident) => {
                const imgUrl = typeof inc.imageUrl === "string" && inc.imageUrl.trim() !== "" ? inc.imageUrl : null;
                const isSelected = selectedIds.includes(inc._id);

                return (
                  <tr
                    key={inc._id}
                    className={`transition-colors hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(inc._id)} className="text-muted-foreground hover:text-primary transition-colors">
                        {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                      </button>
                    </td>

                    <td className="px-6 py-4">
                      {imgUrl ? (
                        <div className="relative group">
                          <img
                            src={imgUrl}
                            alt="incident"
                            className="w-16 h-12 object-cover rounded-lg shadow-lg border border-border/30"
                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/100x80?text=No+Image"; }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-12 bg-muted rounded-lg flex items-center justify-center text-[10px] text-muted-foreground/60 font-bold border border-border/30">
                          NO MEDIA
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{inc.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{inc.type} • {inc.location}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs text-muted-foreground max-w-[200px] truncate">{inc.description}</div>
                      <div className="text-[10px] text-muted-foreground/60 mt-1">
                        {(() => { try { return format(new Date(inc.createdAt), "Pp"); } catch { return "N/A"; } })()}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border text-center ${inc.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : inc.status === "rejected"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : inc.status === "under process"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : inc.status === "problem solved"
                                  ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}
                        >
                          {inc.status}
                        </span>
                        {inc.isImportant && (
                          <span className="bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded text-center uppercase tracking-tighter">
                            Important
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onView(inc)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {(inc.status === "approved" || inc.status === "rejected") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => onDelete(inc._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {incidents.map((inc) => {
          const imgUrl = typeof inc.imageUrl === "string" && inc.imageUrl.trim() !== "" ? inc.imageUrl : null;
          const isSelected = selectedIds.includes(inc._id);

          return (
            <div
              key={inc._id}
              className={`bg-card border border-border/50 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
            >
              {/* Header: Select + Title + Status */}
              <div className="flex justify-between items-start mb-3 gap-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleSelect(inc._id)} className="mt-1 text-muted-foreground hover:text-primary transition-colors">
                    {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                  </button>
                  <div>
                    <h4 className="font-bold text-foreground text-sm line-clamp-2">{inc.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{inc.type}</span>
                      <span className="text-border/50 text-[10px]">•</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{inc.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${inc.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : inc.status === "rejected"
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : inc.status === "under process"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : inc.status === "problem solved"
                            ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}
                  >
                    {inc.status}
                  </span>
                  {inc.isImportant && (
                    <span className="bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      Important
                    </span>
                  )}
                </div>
              </div>

              {/* Body: Image + Info */}
              <div className="mb-4 space-y-3">
                {imgUrl && (
                  <div className="w-full h-32 rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={imgUrl}
                      alt="incident"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/400x200?text=No+Image"; }}
                    />
                  </div>
                )}

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {inc.description}
                </p>
                <div className="text-[10px] text-muted-foreground/60 font-medium pt-2 border-t border-border/30">
                  Reported: {(() => { try { return format(new Date(inc.createdAt), "PPP p"); } catch { return "N/A"; } })()}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onView(inc)}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground text-xs h-9 rounded-lg font-bold"
                >
                  <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                </Button>

                {(inc.status === "approved" || inc.status === "rejected") && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-9 w-9 bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 border rounded-lg"
                    onClick={() => onDelete(inc._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

            </div>
          );
        })}

        {incidents.length === 0 && (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50 border-dashed">
            <p className="text-muted-foreground text-sm">No incidents found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
