import { Card } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";

export interface Incident {
  id: string;
  type: string;
  title: string;
  description: string;
  location: string;
  timestamp: Date;
  imageUrl?: string | null;
}

const IncidentCard = ({ incident }: { incident: Incident }) => {
  return (
    <Card className="p-4 shadow-sm border hover:shadow-md transition">
      
      {/* Image (optional) */}
      {incident.imageUrl && (
        <img
          src={incident.imageUrl}
          alt="Incident"
          className="w-full h-48 object-cover rounded-md mb-4"
        />
      )}

      <h3 className="font-bold text-lg">{incident.title}</h3>

      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
        {incident.description}
      </p>

      <div className="flex items-center text-sm text-muted-foreground mt-3 gap-2">
        <MapPin className="h-4 w-4" />
        {incident.location}
      </div>

      <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
        <Calendar className="h-4 w-4" />
        {incident.timestamp.toLocaleString()}
      </div>
    </Card>
  );
};

export default IncidentCard;
