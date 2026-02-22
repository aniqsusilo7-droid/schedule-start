CREATE TABLE IF NOT EXISTS app_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    base_batch_number BIGINT DEFAULT 5164,
    base_start_time TIMESTAMPTZ DEFAULT NOW(),
    interval_hours BIGINT DEFAULT 1,
    interval_minutes BIGINT DEFAULT 30,
    columns_to_display BIGINT DEFAULT 4,
    audio_enabled BOOLEAN DEFAULT FALSE,
    current_grade TEXT DEFAULT 'SM',
    is_stopped BOOLEAN DEFAULT FALSE,
    alert_threshold_seconds BIGINT DEFAULT 60,
    running_text TEXT DEFAULT 'JIKA DELAY DIATAS 15 MENIT WAJIB ADJUST SCHEDULE!',
    is_marquee_paused BOOLEAN DEFAULT FALSE,
    marquee_speed BIGINT DEFAULT 30,
    theme TEXT DEFAULT 'light',
    layout_order TEXT[] DEFAULT ARRAY['header', 'scheduler', 'catalyst'],
    table_row_height BIGINT DEFAULT 95,
    table_font_size BIGINT DEFAULT 24,
    zoom_level DOUBLE PRECISION DEFAULT 1.0,
    catalyst_data JSONB DEFAULT '{"f": {"netto": "24,9", "bruto": ""}, "h": {"netto": "10,8", "bruto": ""}, "g": {"netto": "", "bruto": ""}}'::jsonb,
    silo_state JSONB DEFAULT '{"activeSilo": null, "silos": {"O": {"id": "O", "lotNumber": "", "capacitySet": "", "startTime": "", "finishTime": "", "percentage": "", "totalUpdate": ""}, "P": {"id": "P", "lotNumber": "", "capacitySet": "", "startTime": "", "finishTime": "", "percentage": "", "totalUpdate": ""}, "Q": {"id": "Q", "lotNumber": "", "capacitySet": "", "startTime": "", "finishTime": "", "percentage": "", "totalUpdate": ""}}}'::jsonb,
    demonomer_data JSONB DEFAULT '{"f2002": 125, "aie2802": 1070, "pvcPercent": 25, "multipliers": {"SM": 118, "SLP": 108, "SLK": 128, "SE": 140, "SR": 100}, "pvcFormula": "F2002*AI2802/1000*%PVC", "steamFormula": "PVC * Multiplier"}'::jsonb
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS schedule_overrides (
    id TEXT PRIMARY KEY,
    override_time TIMESTAMPTZ,
    is_skipped BOOLEAN DEFAULT FALSE,
    mode TEXT DEFAULT 'CLOSE',
    grade TEXT,
    note TEXT,
    shift_subsequent BOOLEAN DEFAULT FALSE,
    manual_delay_minutes BIGINT DEFAULT 0,
    stage_info TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactor_notes (
    reactor_id TEXT PRIMARY KEY,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'app_settings' 
        AND policyname = 'Allow all access to app_settings'
    ) THEN
        CREATE POLICY "Allow all access to app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'schedule_overrides' 
        AND policyname = 'Allow all access to schedule_overrides'
    ) THEN
        CREATE POLICY "Allow all access to schedule_overrides" ON schedule_overrides FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE reactor_notes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'reactor_notes' 
        AND policyname = 'Allow all access to reactor_notes'
    ) THEN
        CREATE POLICY "Allow all access to reactor_notes" ON reactor_notes FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
