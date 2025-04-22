import { NextResponse } from 'next/server';
import { monitors } from '@/lib/config'; // Import config structure
import { runSingleMonitor } from '@/lib/monitorRunner'; // Import the runner function

console.log('🚦 API route handler loaded: /api/trigger/[monitorId]');

export async function POST(request) {
    // Parse monitorId from the URL path
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const monitorId = segments[segments.length - 1];
    console.log(`▶️ Received trigger request for monitor: ${monitorId}`);

    // --- Find the requested monitor --- 
    const monitorToRun = monitors.find(m => m.id === monitorId);

    if (!monitorToRun) {
        console.warn(`🚫 Monitor ID not found: ${monitorId}`);
        return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    // --- Run the monitor --- 
    console.log(`🚀 Triggering run for monitor: ${monitorId}`);
    try {
        const result = await runSingleMonitor(monitorToRun);
        console.log(`✅ Finished trigger run for ${monitorId}. Status: ${result.status}`);
        // Optionally strip sensitive details before sending response
        if (result.errorDetails) {
            result.errorDetails = "Error details logged on server.";
        }
        if (result.emailPreviewHtml && process.env.NODE_ENV === 'production') {
            // Don't send potentially large HTML previews back in production triggers
            result.emailPreviewHtml = "Preview generated (not included in API response).";
        }
        return NextResponse.json(result);

    } catch (error) {
        // This catch is a safety net, runSingleMonitor should handle its own errors
        console.error(`❌❌ Unexpected error triggering monitor ${monitorId}:`, error);
        return NextResponse.json(
            {
                monitorId: monitorId,
                status: 'error',
                message: `Unexpected server error: ${error.message}`,
                errorDetails: "Error details logged on server."
            },
            { status: 500 }
        );
    }
} 