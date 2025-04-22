import { NextResponse } from 'next/server';
import { monitors, globals } from '@/lib/config'; // Import config structure
import { runSingleMonitor } from '@/lib/monitorRunner'; // Import the new runner function

console.log('🚦 API route handler loaded: /api/run-monitor');

export async function GET(request) {
    console.log('▶️ Received request to /api/run-monitor');

    // --- Authorization Check (using globals.cronSecret) --- 
    const expectedSecret = globals.cronSecret;
    const authHeader = request.headers.get('authorization');

    if (expectedSecret) {
        if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
            console.warn('🚫 Unauthorized attempt to trigger monitor job.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('🔑 Authorization successful.');
    } else {
        console.warn('⚠️ Monitor job endpoint is unsecured (CRON_SECRET not set in globals).');
    }
    // --- End Authorization Check ---

    const results = []; // Store results for each monitor
    let overallStatus = 'success'; // Track if any monitor fails

    // --- Loop through each monitor defined in config --- 
    console.log(`🏁 Starting processing for ${monitors.length} monitor(s)...`);

    for (const monitor of monitors) {
        const monitorResult = await runSingleMonitor(monitor); // Call the refactored function
        results.push(monitorResult);
        if (monitorResult.status === 'error') {
            overallStatus = 'partial_error';
        }
    } // End of loop through monitors

    // --- Final Response --- 
    console.log(`
🏁🏁 Finished processing all monitors. Overall status: ${overallStatus}`);

    const responseBody = {
        overallStatus: overallStatus,
        results: results,
    };

    // Conditionally remove preview HTML if in 'send' mode before sending response
    if (globals.sendEmailMode === 'send') {
        responseBody.results.forEach(res => { res.emailPreviewHtml = null; });
    }

    return NextResponse.json(responseBody);
}
