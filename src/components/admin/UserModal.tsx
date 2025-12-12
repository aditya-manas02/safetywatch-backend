import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserModal({
  user,
  incidents,
  onClose,
  onPromote,
  onDemote,
  onDelete,
  isSuperAdmin
}: any) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">

        {/* Close */}
        <button className="absolute right-4 top-4" onClick={onClose}>
          <X className="text-gray-300" />
        </button>

        <h2 className="text-xl font-bold mb-2">{user.email}</h2>

        <p className="text-gray-400 mb-2">
          <strong>Roles:</strong> {user.roles.join(", ")}
        </p>

        <p className="text-gray-400 mb-4">
          <strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}
        </p>

        {/* Promote / Demote Buttons */}
        <div className="flex gap-4 mb-6">
          {!user.roles.includes("admin") && (
            <Button className="bg-blue-600" onClick={() => onPromote(user._id)}>
              Promote to Admin
            </Button>
          )}

          {user.roles.includes("admin") && isSuperAdmin && (
            <Button className="bg-red-600" onClick={() => onDemote(user._id)}>
              Remove Admin Role
            </Button>
          )}

          {isSuperAdmin && (
            <Button variant="destructive" onClick={() => onDelete(user._id)}>
              Delete User
            </Button>
          )}
        </div>

        {/* User Incidents */}
        <h3 className="text-lg font-semibold border-b border-gray-700 mb-3">
          User Incidents
        </h3>

        {incidents.length === 0 ? (
          <p className="text-gray-500">No incidents reported.</p>
        ) : (
          <ul className="space-y-2">
            {incidents.map((i: any) => (
              <li key={i._id} className="p-3 bg-gray-800 rounded border border-gray-700">
                <strong>{i.title}</strong>
                <p className="text-gray-400">{i.status}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
