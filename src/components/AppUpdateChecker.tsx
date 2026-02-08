import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
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
        // Skip check if not on native platform (Android/iOS)
        if (!Capacitor.isNativePlatform()) {
            console.log('[VERSION_CHECK] Running on web platform, skipping native version check.');
            return;
        }

        try {
            // Get current app version
            const appInfo = await CapacitorApp.getInfo();
            const current = appInfo.version;
            setCurrentVersion(current);

            // Fetch latest version info
            const response = await fetch('/version.json');
            const data: VersionInfo = await response.json();
            setVersionInfo(data);

            // Check if update is available
            const updateAvailable = isOutdated(current, data.version);

            if (updateAvailable) {
                setShowUpdate(true);
                // Force mandatory update as per user request: "user can only enter the app when they have the latest version"
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
        if (!versionInfo?.url) {
            console.error('[VERSION_CHECK] No download URL available');
            return;
        }

        console.log('[VERSION_CHECK] Initiating download:', versionInfo.url);

        try {
            if (Capacitor.isNativePlatform()) {
                // For native apps, Browser.open is the most reliable way to trigger 
                // the external browser for a file download.
                await Browser.open({ url: versionInfo.url });
            } else {
                // For web, simple window.open or a direct temporary link click
                const link = document.createElement('a');
                link.href = versionInfo.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.download = 'SafetyWatch.apk';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('[VERSION_CHECK] Download failed:', error);
            // Final fallback
            window.open(versionInfo.url, '_blank');
        }
    };

    if (!showUpdate || !versionInfo) return null;

    return (
        <AlertDialog open={showUpdate} onOpenChange={isMandatory ? undefined : setShowUpdate}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {isMandatory ? (
                            <>
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Update Required
                            </>
                        ) : (
                            <>
                                <Download className="h-5 w-5 text-primary" />
                                Update Available
                            </>
                        )}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 text-left">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {isMandatory
                                    ? 'You must update to continue using SafetyWatch. Your current version is no longer supported.'
                                    : 'A new version of SafetyWatch is available!'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm">
                                <span className="font-medium">Current Version:</span> {currentVersion}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Latest Version:</span> {versionInfo.version}
                            </p>
                            {isMandatory && (
                                <p className="text-sm text-destructive font-medium">
                                    Updates are mandatory to ensure security and performance.
                                </p>
                            )}
                        </div>
                        {versionInfo.notes && (
                            <div className="rounded-md bg-muted p-3">
                                <p className="text-sm font-medium mb-1">What's New:</p>
                                <p className="text-sm text-muted-foreground">{versionInfo.notes}</p>
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-4">
                    {!isMandatory && (
                        <AlertDialogAction
                            asChild
                            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        >
                            <button onClick={() => setShowUpdate(false)}>
                                Remind Me Later
                            </button>
                        </AlertDialogAction>
                    )}
                    <AlertDialogAction asChild>
                        <a
                            href={versionInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download="SafetyWatch.apk"
                            className={cn(
                                buttonVariants({ variant: isMandatory ? "destructive" : "default" }),
                                "w-full pointer-events-auto flex items-center justify-center gap-2"
                            )}
                            onClick={(e) => {
                                console.log('[VERSION_CHECK] Manual click triggered for:', versionInfo.url);
                                // We don't preventDefault here to allow the link to work naturally
                                if (Capacitor.isNativePlatform()) {
                                    e.preventDefault();
                                    handleDownload();
                                }
                            }}
                        >
                            <Download className="h-4 w-4" />
                            {isMandatory ? 'Update Now (Required)' : 'Download Update'}
                        </a>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
