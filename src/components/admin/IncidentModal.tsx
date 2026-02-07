  import { Button } from "@/components/ui/button";
  import { X } from "lucide-react";
  import MapPicker from "@/components/MapPicker";

  export default function IncidentModal({ incident, onClose, onApprove, onReject, onDelete }: any) {
    if (!incident) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-3xl p-6 relative overflow-y-auto max-h-[90vh]">

          {/* Close */}
          <button className="absolute right-4 top-4" onClick={onClose}>
            <X className="text-gray-300" />
          </button>

          <h2 className="text-xl font-bold text-gray-100 mb-4">{incident.title}</h2>

          {/* Image */}
          {incident.imageUrl && (
            <img
              src={incident.imageUrl}
              className="w-full h-64 object-cover rounded mb-4"
            />
          )}

          {/* Map */}
          {incident.latitude && incident.longitude && (
            <div className="mb-4">
              <MapPicker
                onSelect={() => {}}
                initialPosition={{ lat: incident.latitude, lng: incident.longitude }}
                readonly
              />
            </div>
          )}

          {/* Description */}
          <p className="text-gray-300 mb-4">{incident.description}</p>

          {/* Information */}
          <div className="text-gray-400 mb-4">
            <p><strong>Type:</strong> {incident.type}</p>
            <p><strong>Location:</strong> {incident.location}</p>
            <p><strong>Date:</strong> {new Date(incident.createdAt).toLocaleString()}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            {incident.status === "pending" && (
              <>
                <Button className="bg-green-600" onClick={() => onApprove(incident._id)}>
                  Approve
                </Button>
                <Button className="bg-red-600" onClick={() => onReject(incident._id)}>
                  Reject
                </Button>
              </>
            )}
            <Button variant="destructive" onClick={() => onDelete(incident._id)}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  }
