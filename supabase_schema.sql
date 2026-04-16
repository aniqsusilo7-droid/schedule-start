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
    grade_mode TEXT DEFAULT 'normal'
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

CREATE TABLE IF NOT EXISTS catatan_data (
    id BIGINT PRIMARY KEY DEFAULT 1,
    grade_control JSONB DEFAULT '[
        {"code": "ESF0907201", "desc": "E-PO GRADE MATCHFOR BL"},
        {"code": "ESF1018222", "desc": "GRADE CTRL RE-S"},
        {"code": "ESF1018223", "desc": "GRADE CTRL RE-T"},
        {"code": "ESF1018224", "desc": "GRADE CTRL RE-U"},
        {"code": "ESF1018225", "desc": "GRADE CTRL RE-V"},
        {"code": "ESF1018226", "desc": "GRADE CTRL RE-W"},
        {"code": "ESF1018227", "desc": "GRADE CTRL VE-E118A"},
        {"code": "ESF1018228", "desc": "GRADE CTRL VE-E118B"},
        {"code": "ESF1018229", "desc": "GRADE CTRL DEMONOMER"},
        {"code": "ESF1018230", "desc": "GRADE CTRL VE-E202"},
        {"code": "ESF1018231", "desc": "GRADE CTRL DRYING"},
        {"code": "ESF1018232", "desc": "GRADE CTRL SILO O"},
        {"code": "ESF1018233", "desc": "GRADE CTRL SILO P"},
        {"code": "ESF1018234", "desc": "GRADE CTRL SILO Q"},
        {"code": "ECT0907703", "desc": "WASH CT"}
    ]'::jsonb,
    special_notes JSONB DEFAULT '[
        {"cat": "RE-S grade", "code": "EBD0907626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-T grade", "code": "EBD0910626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-U grade", "code": "EBD0913626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-V grade", "code": "EBD0916626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-W grade", "code": "EBD0919626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "Drying Grade", "code": "EBD1019110.DT06", "bold": true, "color": "bg-white/80"},
        {"cat": "Blowdown A", "code": "EBD1019110.DT07"},
        {"cat": "Blowdown B", "code": "EBD1019110.DT08"},
        {"cat": "Slurry Tank", "code": "EBD1019110.DT09"},
        {"cat": "Silo O Grade", "code": "EBD1019110.DT10"},
        {"cat": "Silo P Grade", "code": "EBD1019110.DT11"},
        {"cat": "Silo Q Grade", "code": "EBD1019110.DT12"},
        {"cat": "LOT NUMBER DI PI", "code": "EBD1015111.NX01"},
        {"cat": "LOT NUMBER DI SILO (O)", "code": "EBD1015111.NX02"},
        {"cat": "LOT NUMBER DI SILO (P)", "code": "EBD1015111.NX03"},
        {"cat": "LOT NUMBER DI SILO (Q)", "code": "EBD1015111.NX04"}
    ]'::jsonb,
    master_reference JSONB DEFAULT '[
        {"type": "EBD", "s": "09076 [01-04]", "t": "09106", "u": "09136", "v": "09166", "w": "09196", "demo": "1004101<br/>10041 [12-14]", "dry": "10082 [01-07]", "rec": "10116 [01-03]", "silo": "1015", "sa": "09023 [01-06]", "util": "-"},
        {"type": "ESF", "s": "09067, 09068,<br/>09069, 09070", "t": "09097, 09098,<br/>09099, 09100", "u": "09127, 09128,<br/>09129, 09130", "v": "09157, 09158,<br/>09159, 09160", "w": "09187, 09188,<br/>09189, 09190", "demo": "10027 [01-18]<br/>1002733", "dry": "10067 [01-27]<br/>10068 [01-18]<br/><span class=\"text-[10px] text-red-600 font-black\">(2,4,5 & 10 tdk ada)</span>", "rec": "10108 [01-31]", "silo": "1014", "sa": "09020 [01-10]", "util": "-"},
        {"type": "TIMER", "s": "09077, 09078,<br/>09079, 09080", "t": "09107, 09108,<br/>09109, 09110", "u": "09137, 09138,<br/>09139, 09140", "v": "09167, 09168,<br/>09169, 09170", "w": "09197, 09198,<br/>09199, 09200", "demo": "10043", "dry": "10083", "rec": "10118", "silo": "10152", "sa": "9024", "util": "-"},
        {"type": "ELC", "s": "09071, 09072, 09073", "t": "09101, 09102, 09103", "u": "09131, 09132, 09133", "v": "09161, 09162, 09163", "w": "09191, 09192, 09193", "demo": "10026, 10028", "dry": "10066, 10067,<br/>10068, 10070", "rec": "10106, 10108, 10110", "silo": "10141, 10142, 10143", "sa": "09019", "util": "10181, 10183, 10186"}
    ]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO catatan_data (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE kesepakatan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to kesepakatan" ON kesepakatan FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE catatan_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to catatan_data" ON catatan_data FOR ALL USING (true) WITH CHECK (true);

