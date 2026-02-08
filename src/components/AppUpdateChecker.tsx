import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

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

    useEffect(() => {
        checkForUpdates();
    }, []);

    const checkForUpdates = async () => {
        try {
            // Get current app version
            const appInfo = await CapacitorApp.getInfo();
            const current = appInfo.version;
            setCurrentVersion(current);

            // Fetch latest version info
            const response = await fetch('/version.json');
            const data: VersionInfo = await response.json();
            setVersionInfo(data);

            // Compare versions
            if (isOutdated(current, data.version)) {
                setShowUpdate(true);
            }
        } catch (error) {
            console.error('[VERSION_CHECK] Failed to check for updates:', error);
        }
    };

    const isOutdated = (current: string, latest: string): boolean => {
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

    const handleDownload = () => {
        if (versionInfo?.url) {
            window.open(versionInfo.url, '_blank');
        }
    };

    if (!showUpdate || !versionInfo) return null;

    return (
        <AlertDialog open={showUpdate} onOpenChange={setShowUpdate}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Update Available
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 text-left">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                A new version of SafetyWatch is available!
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm">
                                <span className="font-medium">Current Version:</span> {currentVersion}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Latest Version:</span> {versionInfo.version}
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
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowUpdate(false)}
                        className="w-full sm:w-auto"
                    >
                        Later
                    </Button>
                    <Button
                        onClick={handleDownload}
                        className="w-full sm:w-auto"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download Update
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
