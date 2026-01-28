import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export interface IncidentTableProps {
  incidents: any[];
  onView: (incident: any) => void;
}

const statusColor: any = {
  pending: "bg-yellow-600",
  approved: "bg-green-600",
  rejected: "bg-red-600",
};

export default function IncidentTable({ incidents, onView }: IncidentTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900">
      <table className="w-full text-gray-200">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-3 text-left">Image</th>
            <th className="p-3 text-left">Title</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-left">Location</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              key={incident._id}
              className="border-t border-gray-700 hover:bg-gray-800 transition"
            >
              <td className="p-3">
                {incident.imageUrl ? (
                  <img
                    src={incident.imageUrl}
                    className="w-14 h-14 object-cover rounded"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-700 rounded" />
                )}
              </td>

              <td className="p-3">{incident.title}</td>
              <td className="p-3 capitalize">{incident.type}</td>
              <td className="p-3">{incident.location}</td>

              <td className="p-3">
                {new Date(incident.createdAt).toLocaleString()}
              </td>

              <td className="p-3">
                <Badge className={`${statusColor[incident.status]} text-white`}>
                  {incident.status}
                </Badge>
              </td>

              <td className="p-3">
                <Button size="sm" onClick={() => onView(incident)}>
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
