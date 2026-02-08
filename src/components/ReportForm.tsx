// d:\safe-neighborhood-watch-main11\frontend\src\components\ReportForm.tsx

import { useState, useRef } from "react";
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
import { X, AlertCircle, MapPin, Type, Camera, Send, CheckCircle2, RefreshCw } from "lucide-react";
import MapPicker from "./MapPicker";
import { Switch } from "@/components/ui/switch";
import { MessageSquareOff, MessageSquareText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ReportData {
  type: string;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  imageFile: File | null;
  allowMessages: boolean;
}

interface ReportFormProps {
  onClose: () => void;
  onSubmit: (report: ReportData) => Promise<void>;
}

export default function ReportForm({ onClose, onSubmit }: ReportFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
    allowMessages: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({ title: "Camera Error", description: "Could not access camera. Please check permissions.", variant: "destructive" });
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
            setImageFile(file);
            setImagePreview(URL.createObjectURL(blob));
            stopCamera();
          }
        }, "image/jpeg");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.type ||
      !formData.title ||
      !formData.description ||
      !formData.location
    ) {
      toast({ title: "Incomplete Form", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        imageFile,
      });

      toast({ title: "Success", description: "Incident reported successfully" });
      onClose();
    } catch (error) {
      toast({ title: "Error", description: "Failed to report incident", variant: "destructive" });
    }

    setLoading(false);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-background/60 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto pt-12 sm:pt-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl mb-12"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="relative overflow-hidden border-none shadow-premium glass-card overflow-y-auto max-h-[90vh]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 via-blue-400/60 to-primary/60"></div>

          <div className="p-6 sm:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  New Report
                </h2>
                <p className="text-muted-foreground/60 text-xs font-bold uppercase tracking-widest mt-2 ml-13">Incident Intelligence Upload</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-red-500/10 hover:text-red-500 transition-all"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* SECTION 1: INCIDENT DETAILS */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  <Type className="h-3.5 w-3.5 text-primary/60" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Core Data</span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">
                      Classification <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v })}
                    >
                      <SelectTrigger className="h-12 bg-white/40 dark:bg-muted/30 border-none ring-1 ring-border/50 focus:ring-primary/20 rounded-xl shadow-sm text-sm font-semibold">
                        <SelectValue placeholder="Event Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/40 shadow-premium backdrop-blur-xl bg-white/90 dark:bg-card/90">
                        <SelectItem value="theft" className="font-semibold">Theft / Burglary</SelectItem>
                        <SelectItem value="vandalism" className="font-semibold">Property Damage</SelectItem>
                        <SelectItem value="suspicious" className="font-semibold">Suspicious Activity</SelectItem>
                        <SelectItem value="assault" className="font-semibold">Safety Threat / Assault</SelectItem>
                        <SelectItem value="fire" className="font-semibold">Fire / Smoke</SelectItem>
                        <SelectItem value="medical" className="font-semibold">Medical Emergency</SelectItem>
                        <SelectItem value="hazard" className="font-semibold">Natural Hazard / Disaster</SelectItem>
                        <SelectItem value="traffic" className="font-semibold">Traffic / Road Accident</SelectItem>
                        <SelectItem value="infrastructure" className="font-semibold">Infrastructure Failure</SelectItem>
                        <SelectItem value="nuisance" className="font-semibold">Noise / Public Nuisance</SelectItem>
                        <SelectItem value="missing" className="font-semibold">Missing Person / Pet</SelectItem>
                        <SelectItem value="harassment" className="font-semibold">Harassment / Stalking</SelectItem>
                        <SelectItem value="other" className="font-semibold">General Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">
                      Signal Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      className="h-12 bg-white/40 dark:bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-primary/20 rounded-xl shadow-sm text-sm font-semibold"
                      placeholder="Identified subject..."
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">
                    Event Log <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    className="bg-white/40 dark:bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-primary/20 resize-none rounded-xl shadow-sm text-sm font-semibold p-4"
                    rows={4}
                    placeholder="Comprehensive description of the situation..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* SECTION 2: EVIDENCE & LOCATION */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-muted/50">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Evidence & Location</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 ml-1">
                      Specific Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      className="h-11 bg-muted/40 border-none focus-visible:ring-primary/20 rounded-xl"
                      placeholder="Street, landmark, or area..."
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5 ml-1">
                      Upload or Capture Evidence
                    </Label>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1 group">
                          <Input
                            type="file"
                            accept="image/*"
                            className="h-11 bg-muted/40 border-none focus-visible:ring-primary/20 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 rounded-xl overflow-hidden"
                            onChange={handleFileChange}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 rounded-xl border-primary/20 hover:bg-primary/10 transition-colors shrink-0"
                          onClick={startCamera}
                        >
                          <Camera className="h-4 w-4 text-primary" />
                        </Button>
                      </div>

                      <AnimatePresence>
                        {isCapturing && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="relative rounded-xl overflow-hidden bg-black"
                          >
                            <video ref={videoRef} autoPlay playsInline className="w-full aspect-video object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                              <Button type="button" size="sm" className="rounded-full px-6 font-bold" onClick={capturePhoto}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Capture
                              </Button>
                              <Button type="button" size="sm" variant="destructive" className="rounded-full px-4" onClick={stopCamera}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {imagePreview && !isCapturing && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative rounded-xl overflow-hidden border border-muted"
                          >
                            <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                              onClick={() => { setImageFile(null); setImagePreview(null); }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-muted/50 overflow-hidden shadow-sm">
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
              </div>

              {/* SECTION 3: PRIVACY SETTINGS */}
              <div className="bg-primary/[0.03] border border-primary/10 p-6 rounded-2xl flex items-center justify-between group hover:bg-primary/[0.05] transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {formData.allowMessages ? (
                      <MessageSquareText className="h-4 w-4 text-primary" />
                    ) : (
                      <MessageSquareOff className="h-4 w-4 text-rose-500" />
                    )}
                    <Label className="text-sm font-black tracking-tight cursor-pointer">
                      Allow Community Messaging
                    </Label>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest pl-6">
                    {formData.allowMessages
                      ? "Authorized users can contact you privately about this report."
                      : "Messaging is disabled for this report (Maximum Privacy Mode)."}
                  </p>
                </div>
                <Switch
                  checked={formData.allowMessages}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowMessages: checked })}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 sm:flex-row flex-col-reverse">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 h-12 text-muted-foreground font-bold hover:text-foreground rounded-xl"
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:flex-1 h-12 font-black text-lg shadow-xl shadow-primary/25 rounded-xl hover:scale-[1.01] transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Reporting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Submit Incident Report
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
