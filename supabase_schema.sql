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
    alarm_sound TEXT DEFAULT 'siren',
    table_row_height BIGINT DEFAULT 95,
    table_font_size BIGINT DEFAULT 26,
    batch_duration_minutes BIGINT DEFAULT 120,
    hidden_reactors TEXT[] DEFAULT ARRAY[]::TEXT[],
    hidden_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
    zoom_level DOUBLE PRECISION DEFAULT 1.0,
    catalyst_data JSONB DEFAULT '{"f": {"netto": "24,9", "bruto": ""}, "h": {"netto": "10,8", "bruto": ""}, "g": {"netto": "", "bruto": ""}}'::jsonb,
    silo_state JSONB DEFAULT '{"activeSilo": null, "silos": {"O": {"id": "O", "lotNumber": "", "capacitySet": "", "startTime": "", "finishTime": "", "percentage": "", "totalUpdate": ""}, "P": {"id": "P", "lotNumber": "", "capacitySet": "", "startTime": "", "finishTime": "", "percentage": "", "totalUpdate": ""}, "Q": {"id": "Q", "lotNumber": "", "capacitySet": "", "startTime": "", "finishTime": "", "percentage": "", "totalUpdate": ""}}}'::jsonb,
    demonomer_data JSONB DEFAULT '{"f2002": 125, "aie2802": 1070, "pvcPercent": 25, "multipliers": {"SM": 118, "SLP": 108, "SLK": 128, "SE": 140, "SR": 100}, "pvcFormula": "F2002*AI2802/1000*%PVC", "steamFormula": "PVC * Multiplier"}'::jsonb,
    grade_mode TEXT DEFAULT 'normal',
    cycle_time_data JSONB DEFAULT '[{"id": 1, "ns": "", "readyBlowing": "", "blowing": "", "blowingComplete": ""}, {"id": 2, "ns": "", "readyBlowing": "", "blowing": "", "blowingComplete": ""}]'::jsonb
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS schedule_overrides (
    id TEXT PRIMARY KEY,
    override_time TIMESTAMPTZ,
    is_skipped BOOLEAN DEFAULT FALSE,
    skip_reason TEXT DEFAULT 'PASS',
    mode TEXT DEFAULT 'CLOSE',
    grade TEXT,
    note TEXT,
    shift_subsequent BOOLEAN DEFAULT FALSE,
    manual_delay_minutes BIGINT DEFAULT 0,
    stage_info TEXT,
    custom_interval_hours INT DEFAULT NULL,
    custom_interval_minutes INT DEFAULT NULL,
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

CREATE TABLE IF NOT EXISTS kesepakatan (
    id BIGINT PRIMARY KEY DEFAULT 1,
    data JSONB DEFAULT '{
        "shifts": [
            {"name": "SHIFT 1", "time": "22:45 - 07:00", "closeMode": "22:25", "openMode": "21:55"},
            {"name": "SHIFT 2", "time": "06:45 - 15:00", "closeMode": "06:25", "openMode": "05:55"},
            {"name": "SHIFT 3", "time": "14:45 - 23:00", "closeMode": "14:25", "openMode": "13:55"}
        ],
        "additionalNotes": [
            "DEMONOMER F LINE WASHING Pertama >= JAM 06:25 , 14:25 , 22:25",
            "SAMPLE SA DISSOLUTION COMPLETE >= JAM 22:25",
            "SILO CHARGE COMPLETTE >= JAM 6:25 , 14:25 , 22:25"
        ],
        "footerNote": "TANGGUNG JAWAB SHIFT YANG BARU DATANG"
    }'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO kesepakatan (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE kesepakatan ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'kesepakatan' 
        AND policyname = 'Allow all access to kesepakatan'
    ) THEN
        CREATE POLICY "Allow all access to kesepakatan" ON kesepakatan FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    summary TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    administrative_date DATE,
    active_shifts TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    shift_groups JSONB NOT NULL DEFAULT '{}'::jsonb,
    before_data JSONB,
    after_data JSONB
);

CREATE INDEX IF NOT EXISTS audit_logs_changed_at_idx ON audit_logs (changed_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx ON audit_logs (event_type);
CREATE INDEX IF NOT EXISTS audit_logs_administrative_date_idx ON audit_logs (administrative_date);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies
        WHERE tablename = 'audit_logs'
        AND policyname = 'Allow read access to audit_logs'
    ) THEN
        CREATE POLICY "Allow read access to audit_logs"
            ON audit_logs FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies
        WHERE tablename = 'audit_logs'
        AND policyname = 'Allow insert access to audit_logs'
    ) THEN
        CREATE POLICY "Allow insert access to audit_logs"
            ON audit_logs FOR INSERT WITH CHECK (true);
    END IF;
END $$;
