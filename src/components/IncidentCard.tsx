import { Card } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.div
      whileHover={{
        y: -8,
        rotateX: 4,
        rotateY: -4,
        scale: 1.02,
      }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Card className="relative p-4 border shadow-sm hover:shadow-xl transition overflow-hidden">

        {/* Glow */}
        <div className="absolute inset-0 bg-blue-500/10 opacity-0 hover:opacity-100 transition blur-xl -z-10" />

        {/* Image */}
        {incident.imageUrl && (
          <motion.img
            src={incident.imageUrl}
            alt="Incident"
            className="w-full h-48 object-cover rounded-md mb-4"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
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
    </motion.div>
  );
};

export default IncidentCard;
