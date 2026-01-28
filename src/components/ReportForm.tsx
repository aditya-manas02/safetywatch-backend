import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import MapPicker from "./MapPicker";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ReportFormProps {
  onClose: () => void;
  onSubmit: (report: any) => Promise<void>;
}

export default function ReportForm({ onClose, onSubmit }: ReportFormProps) {
  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.type ||
      !formData.title ||
      !formData.description ||
      !formData.location
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        imageFile,
      });

      toast.success("Incident reported successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to report incident");
    }

    setLoading(false);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Card className="p-6 relative max-h-[90vh] overflow-y-auto">

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <h2 className="text-2xl font-bold mb-4">Report an Incident</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Incident Type */}
            <div>
              <Label>Incident Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({ ...formData, type: v })
                }
              >
                <SelectTrigger className="focus-glow">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspicious">Suspicious Activity</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="vandalism">Vandalism</SelectItem>
                  <SelectItem value="assault">Assault</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label>Title *</Label>
              <Input
                className="focus-glow"
                placeholder="Short title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            {/* Location */}
            <div>
              <Label>Location *</Label>
              <Input
                className="focus-glow"
                placeholder="Address or landmark"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>

            {/* Map Picker */}
            <div>
              <Label>Pick Exact Location (Optional)</Label>
              <MapPicker
                onSelect={(lat, lng) =>
                  setFormData({
                    ...formData,
                    latitude: lat,
                    longitude: lng,
                  })
                }
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description *</Label>
              <Textarea
                className="focus-glow"
                rows={4}
                placeholder="Describe what happened"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label>Upload Image (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                className="focus-glow"
                onChange={(e) =>
                  setImageFile(e.target.files?.[0] || null)
                }
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>

          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
