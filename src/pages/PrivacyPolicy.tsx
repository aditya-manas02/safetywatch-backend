import { motion } from "framer-motion";
import { Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-background text-foreground p-6 md:p-12 lg:p-24"
        >
            <div className="max-w-4xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/")}
                    className="mb-8 hover:bg-primary/10"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>

                <div className="flex items-center gap-4 mb-12">
                    <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight">Privacy Policy</h1>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-muted-foreground font-medium leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">1. Data Collection</h2>
                        <p>
                            SafetyWatch collects minimal personal data required for community safety, including your name, email address, and optionally your phone number. We also process incident reports and location data you explicitly share to populate the safety heatmap.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
                        <p>
                            Your data is used to verify incident reports, send neighborhood alerts, and provide a secure environment for community interaction. Location data is anonymized where possible for general heatmap statistics.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">3. Data Sharing</h2>
                        <p>
                            We do not sell your personal data. Information you include in public reports (location, description, evidence) is visible to other community members to ensure transparency and safety awareness.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">4. Your Rights</h2>
                        <p>
                            You have the right to access, correct, or delete your personal information at any time. For data requests, please contact us at <span className="text-primary font-bold">safetywatch4neighbour@gmail.com</span>.
                        </p>
                    </section>

                    <section className="pt-12 border-t">
                        <p className="text-sm">Last updated: January 30, 2026</p>
                    </section>
                </div>
            </div>
        </motion.div>
    );
}
