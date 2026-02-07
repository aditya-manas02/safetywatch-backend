// src/components/admin/CyberIncidentModal.tsx
import { X, Trash2 } from "lucide-react";
import MapPicker from "@/components/MapPicker";
import { Button } from "@/components/ui/button";

export default function CyberIncidentModal({
  incident,
  onClose,
  onApprove,
  onReject,
  onDelete, // <-- NEW PROP
}: any) {
  if (!incident) return null;

  const imgUrl =
    typeof incident.imageUrl === "string" && incident.imageUrl.trim() !== ""
      ? incident.imageUrl
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl bg-[#071021] border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">{incident.title}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white">
            <X />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT SIDE */}
          <div className="md:col-span-2 space-y-4">
            {imgUrl ? (
              <img
                src={imgUrl}
                className="w-full h-64 object-cover rounded"
              />
            ) : (
              <div className="w-full h-64 bg-[#0b1220] rounded flex items-center justify-center text-slate-500">
                No Image Provided
              </div>
            )}

            <div className="text-slate-200">
              <p className="mb-2">{incident.description}</p>
              <p className="text-slate-400 text-sm">
                <strong>Location:</strong> {incident.location}
              </p>
              <p className="text-slate-400 text-sm">
                <strong>Reported:</strong>{" "}
                {new Date(incident.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="md:col-span-1 space-y-4">
            
            {/* STATUS */}
            <div className="bg-[#061022] p-4 rounded border border-gray-800">
              <p className="text-slate-300 text-sm mb-2">Status</p>
              <span
                className={`px-3 py-1 rounded text-sm ${
                  incident.status === "approved"
                    ? "bg-green-600/20 text-green-300"
                    : incident.status === "rejected"
                    ? "bg-red-600/20 text-red-300"
                    : "bg-amber-600/20 text-amber-300"
                }`}
              >
                {incident.status}
              </span>
            </div>

            {/* ACTION BUTTONS */}
            <div className="bg-[#061022] p-4 rounded border border-gray-800">
              <p className="text-slate-300 text-sm mb-2">Actions</p>
              <div className="flex flex-col gap-2">
                
                {/* Approve/Reject only for pending */}
                {incident.status === "pending" && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => onApprove(incident._id)}
                    >
                      Approve
                    </Button>

                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => onReject(incident._id)}
                    >
                      Reject
                    </Button>
                  </>
                )}

                {/* DELETE ONLY IF APPROVED */}
                {incident.status === "approved" && (
                  <Button
                    className="bg-red-700 hover:bg-red-800"
                    onClick={() => {
                      if (window.confirm("Delete this approved incident?")) {
                        onDelete(incident._id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                )}

                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>

            {/* MAP */}
            <div className="bg-[#061022] p-4 rounded border border-gray-800">
              <p className="text-slate-300 text-sm mb-2">Map</p>

              {incident.latitude && incident.longitude ? (
                <MapPicker
                  onSelect={() => {}}
                  initialPosition={{
                    lat: incident.latitude,
                    lng: incident.longitude,
                  }}
                  readonly
                />
              ) : (
                <div className="h-40 rounded bg-[#0b1220] flex items-center justify-center text-slate-500">
                  No Coordinates Available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
