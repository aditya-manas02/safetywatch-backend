// src/components/admin/CyberIncidentTable.tsx
import { format } from "date-fns";
import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CyberIncidentTable({
  incidents = [],
  onView,
  onDelete, // <-- NEW PROP
}: any) {
  return (
    <div className="bg-[#071328] border border-gray-800 rounded-lg overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-[#081325]">
          <tr>
            <th className="px-6 py-3">#</th>
            <th className="px-6 py-3">Image</th>
            <th className="px-6 py-3">Title</th>
            <th className="px-6 py-3">Type</th>
            <th className="px-6 py-3">Location</th>
            <th className="px-6 py-3">Date</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          {incidents.map((inc: any, idx: number) => {
            const imgUrl =
              typeof inc.imageUrl === "string" && inc.imageUrl.trim() !== ""
                ? inc.imageUrl
                : null;

            return (
              <tr key={inc._id} className="border-t border-gray-800">
                <td className="px-6 py-4 align-top">{idx + 1}</td>

                {/* IMAGE COLUMN */}
                <td className="px-6 py-4">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt="incident"
                      className="w-16 h-12 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://via.placeholder.com/100x80?text=No+Image";
                      }}
                    />
                  ) : (
                    <div className="w-16 h-12 bg-[#0b1220] rounded flex items-center justify-center text-slate-500 text-xs">
                      No image
                    </div>
                  )}
                </td>

                <td className="px-6 py-4">{inc.title}</td>
                <td className="px-6 py-4 capitalize">{inc.type}</td>
                <td className="px-6 py-4">{inc.location}</td>

                <td className="px-6 py-4">
                  {format(new Date(inc.createdAt), "Pp")}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      inc.status === "approved"
                        ? "bg-green-700/20 text-green-300"
                        : inc.status === "rejected"
                        ? "bg-red-700/20 text-red-300"
                        : "bg-amber-700/20 text-amber-300"
                    }`}
                  >
                    {inc.status}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="px-6 py-4 flex gap-2">
                  <Button size="sm" onClick={() => onView(inc)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>

                  {/* DELETE ONLY IF APPROVED */}
                  {inc.status === "approved" && (
                    <Button
                      size="sm"
                      className="bg-red-700 hover:bg-red-800"
                      onClick={() => {
                        if (window.confirm("Delete this approved incident?")) {
                          onDelete(inc._id);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
