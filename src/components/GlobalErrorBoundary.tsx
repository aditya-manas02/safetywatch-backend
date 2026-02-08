import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#05070b] text-white flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className="relative inline-block">
                            <div className="h-24 w-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-4 mx-auto">
                                <AlertTriangle className="h-12 w-12 text-red-500" />
                            </div>
                            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-black tracking-tight tracking-tighter">System Interrupted</h1>
                            <p className="text-slate-400 font-medium">SafetyWatch encountered an unexpected logic error. Our security logs have been updated.</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full bg-white text-black font-black hover:bg-slate-200 h-12 rounded-xl"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" /> REBOOT SYSTEM
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => window.location.href = '/'}
                                className="w-full text-slate-500 hover:text-white h-12"
                            >
                                <Home className="mr-2 h-4 w-4" /> RETURN TO BASE
                            </Button>
                        </div>

                        {process.env.NODE_ENV === 'development' && (
                            <pre className="mt-8 p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] text-left overflow-auto max-h-32 text-red-400">
                                {this.state.error?.toString()}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
