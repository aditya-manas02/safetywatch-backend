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
        try {
            // Get current app version (defaults to 1.0.0 for web testing)
            let current = '1.0.0';
            try {
                if (Capacitor.isNativePlatform()) {
                    const appInfo = await CapacitorApp.getInfo();
                    current = appInfo.version;
                }
            } catch (e) {
                console.log('[VERSION_CHECK] Native version check failed, using web default.');
            }

            setCurrentVersion(current);

            // Fetch latest version info with cache busting
            const response = await fetch(`/version.json?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch version.json');
            const data: VersionInfo = await response.json();
            console.log('[VERSION_CHECK] Fetched data:', data);
            setVersionInfo(data);

            // Check if update is available
            const updateAvailable = isOutdated(current, data.version);
            console.log(`[VERSION_CHECK] Current: ${current}, Latest: ${data.version}, Update Available: ${updateAvailable}`);

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
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                textAlign: 'left'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <AlertTriangle style={{ color: '#ef4444', width: '24px', height: '24px' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Update Required</h2>
                </div>

                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                    You must update to continue using SafetyWatch. Your current version ({currentVersion}) is no longer supported.
                </p>

                <div style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                    {versionInfo.notes && (
                        <p style={{ fontSize: '13px', margin: 0 }}><strong>What's New:</strong> {versionInfo.notes}</p>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <a
                        href={versionInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            textAlign: 'center'
                        }}
                        onClick={() => {
                            console.log('[VERSION_CHECK] Button link clicked');
                            // In case browser blocks direct Link, try programmatic too
                            setTimeout(() => {
                                window.location.href = versionInfo.url;
                            }, 100);
                        }}
                    >
                        <Download size={18} />
                        Update Now (Required)
                    </a>
                </div>

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <a
                        href={versionInfo.url}
                        style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'underline' }}
                    >
                        Alternative Direct Download Link
                    </a>
                </div>
            </div>
        </div>
    );
}
