import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Download, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VersionInfo {
    version: string;
    minVersion: string;
    url: string;
    notes: string;
}

export function AppUpdateChecker() {
    const [showUpdate, setShowUpdate] = useState(false);
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [isMandatory, setIsMandatory] = useState(false);

    useEffect(() => {
        checkForUpdates();
    }, []);

    const checkForUpdates = async () => {
        // STRICTLY skip if not on native platform (Android/iOS)
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        try {
            // Get current app version
            const appInfo = await CapacitorApp.getInfo();
            const current = appInfo.version;
            setCurrentVersion(current);

            // Fetch latest version info with cache busting from production
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://safetywatch-backend.onrender.com";
            const response = await fetch(`${baseUrl}/version.json?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch version.json');
            const data: VersionInfo = await response.json();
            setVersionInfo(data);

            // Check if update is available
            const updateAvailable = isOutdated(current, data.version);

            if (updateAvailable) {
                setShowUpdate(true);
                // Force mandatory update as per user request
                setIsMandatory(true);
            }
        } catch (error) {
            console.error('[VERSION_CHECK] Failed to check for updates:', error);
        }
    };

    const isOutdated = (current: string, latest: string): boolean => {
        if (!current || !latest) return false;

        const currClean = current.replace(/^v/, '');
        const latestClean = latest.replace(/^v/, '');

        const c = currClean.split('.').map(Number);
        const l = latestClean.split('.').map(Number);

        while (c.length < 3) c.push(0);
        while (l.length < 3) l.push(0);

        for (let i = 0; i < 3; i++) {
            const cv = isNaN(c[i]) ? 0 : c[i];
            const lv = isNaN(l[i]) ? 0 : l[i];
            if (cv < lv) return true;
            if (cv > lv) return false;
        }
        return false;
    };

    const handleDownload = async () => {
        if (versionInfo?.url) {
            console.log('[VERSION_CHECK] Initiating native download redirect:', versionInfo.url);
            try {
                // 1. Primary: Capacitor Browser API (Opens system browser)
                await Browser.open({ url: versionInfo.url, windowName: '_system' });
            } catch (error) {
                console.error('[VERSION_CHECK] Browser.open failed:', error);
                try {
                    // 2. Secondary: window.open with _system
                    window.open(versionInfo.url, '_system');
                } catch (e2) {
                    console.error('[VERSION_CHECK] window.open failed:', e2);
                    // 3. Last resort: location.replace
                    window.location.href = versionInfo.url;
                }
            }
        }
    };

    if (!showUpdate || !versionInfo) return null;

    return (
        <AlertDialog open={showUpdate} onOpenChange={isMandatory ? undefined : setShowUpdate}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Update Required
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 text-left">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                You must update to continue using SafetyWatch. Your current version ({currentVersion}) is no longer supported.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm">
                                <span className="font-medium">Latest Version:</span> {versionInfo.version}
                            </p>
                            <p className="text-sm text-destructive font-medium">
                                Updates are mandatory to ensure security and performance.
                            </p>
                        </div>
                        {versionInfo.notes && (
                            <div className="rounded-md bg-muted p-3">
                                <p className="text-sm font-medium mb-1">What's New:</p>
                                <p className="text-sm text-muted-foreground">{versionInfo.notes}</p>
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-3 mt-6">
                    <Button
                        onClick={handleDownload}
                        className="w-full py-6 text-lg font-bold shadow-lg shadow-destructive/20"
                        variant="destructive"
                    >
                        <Download className="h-5 w-5 mr-2" />
                        Update Now (Opens Chrome)
                    </Button>

                    <div className="space-y-4 pt-2">
                        <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                            Clicking the button will redirect you to your web browser to download the updated SafetyWatch.apk.
                        </p>

                        <div className="flex flex-col gap-2">
                            <a
                                href={versionInfo.url}
                                target="_system"
                                className="text-[12px] text-center text-primary underline font-medium block p-2 rounded-md hover:bg-primary/5"
                                onClick={(e) => {
                                    console.log('[VERSION_CHECK] Manual link click');
                                    // We don't preventDefault here to let target="_system" work
                                }}
                            >
                                Having trouble? Click here to open in Chrome
                            </a>

                            <p className="text-[9px] text-center text-muted-foreground break-all opacity-70">
                                {versionInfo.url}
                            </p>
                        </div>
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
