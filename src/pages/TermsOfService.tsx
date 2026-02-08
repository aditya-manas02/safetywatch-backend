import { motion } from "framer-motion";
import { Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
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
                    <h1 className="text-4xl font-black tracking-tight">Terms of Service</h1>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-muted-foreground font-medium leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By using SafetyWatch, you agree to these terms. Our platform is designed for neighborhood safety and community awareness. You must use the platform responsibly and legally.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">2. Accurate Reporting</h2>
                        <p>
                            Users are strictly prohibited from submitting false, misleading, or malicious incident reports. Any user found deliberately spreading misinformation may have their account permanently suspended.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">3. Prohibited Conduct</h2>
                        <p>
                            Do not use SafetyWatch to harass neighbors, violate privacy, or engage in any form of discrimination. The platform is for reporting safety incidents, not for personal grievances or marketing.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">4. Limitation of Liability</h2>
                        <p>
                            SafetyWatch is a community alerting tool and is not a substitute for emergency services. In case of immediate danger, always call your local emergency number (e.g., 911 or 100) first.
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
