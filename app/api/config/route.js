import { NextResponse } from 'next/server';
import { s3ReadJson, s3WriteJson } from '@/lib/storage';
import { defaultConfig } from '@/lib/config';

export async function GET() {
    // Read raw JSON or null if missing/invalid
    const raw = await s3ReadJson('config/config.json', null);

    // Determine whether to use defaultConfig
    const useFallback =
        !raw ||
        !Array.isArray(raw.monitors) ||
        typeof raw.globals !== 'object' ||
        raw.monitors.length === 0 && Object.keys(raw.globals).length === 0;

    const cfg = useFallback ? defaultConfig : raw;

    // Ensure shape:
    const responseCfg = {
        monitors: Array.isArray(cfg.monitors) ? cfg.monitors : defaultConfig.monitors,
        globals: typeof cfg.globals === 'object' && cfg.globals !== null ? cfg.globals : defaultConfig.globals,
    };

    return NextResponse.json(responseCfg);
}

export async function PUT(req) {
    const cfg = await req.json();        // expects { monitors, globals }
    const cfgToWrite = {
        monitors: Array.isArray(cfg.monitors) ? cfg.monitors : defaultConfig.monitors,
        globals: typeof cfg.globals === 'object' && cfg.globals !== null ? cfg.globals : defaultConfig.globals,
    };
    await s3WriteJson('config/config.json', cfgToWrite);
    return NextResponse.json({ ok: true });
} 