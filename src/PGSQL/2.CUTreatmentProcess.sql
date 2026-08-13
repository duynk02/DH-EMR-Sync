-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-05-27
-- Hàm: badt_dhs.getCUTreatmentProcess(mabn TEXT, maba TEXT, makb TEXT, iddienbien TEXT)
-- Mô tả:
--   - mabn	Mã số bệnh nhân
--   - maba	Mã số bệnh án
--   - makb	Mã số khám bệnh
--   - iddienbien	ID diễn biến
-- Sử dụng:
--   SELECT badt_dhs.getCUTreatmentProcess(mabn, maba, makb, iddienbien);  -- Trả về: thông tin điều trị
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.getCUTreatmentProcess(mabn text, maba text, makb text,iddienbien text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    result text;
    p_mabn ALIAS FOR mabn;
    p_maba ALIAS FOR maba;
    p_makb ALIAS FOR makb;
    p_iddienbien ALIAS FOR iddienbien;
BEGIN
    WITH data AS (
    SELECT dt.*
    FROM current.qtdieutri dt
    WHERE lower(dt.mabn) = lower(p_mabn)
      AND lower(dt.maba) = lower(p_maba)
      AND lower(dt.makb) = lower(p_makb)
      AND lower(dt.iddienbien) = lower(p_iddienbien)
  ),

  -- [Nguyễn Khắc Duy - 2026-04-02] Bổ sung thông tin nhập viện để fallback khi dienbien trống
  adm_info AS (
        SELECT 
            string_agg('- ' || val, E'\n' ORDER BY ord) AS infor_fallback
        FROM (
            SELECT
                NT.lydovv AS lydovv,
                TS.qtbenhly AS qtbenhly,
                COALESCE(NULLIF(BN.bophan, ''), NULLIF(CT.bophan, ''), '') AS bophan
            FROM current.bnnoitru NT
            LEFT JOIN current.hbtsbenh TS ON NT.mabn = TS.mabn AND NT.maba = TS.maba AND NT.makb = TS.makb
            LEFT JOIN current.bangoai BN ON NT.mabn = BN.mabn AND NT.maba = BN.maba AND NT.makb = BN.makb
            LEFT JOIN current.bayhct CT ON NT.mabn = CT.mabn AND NT.maba = CT.maba AND NT.makb = CT.makb
            WHERE NT.mabn = p_mabn
              AND NT.maba = p_maba
              AND NT.makb = p_makb
        ) src
        CROSS JOIN LATERAL
            ( VALUES
                (1, src.lydovv),
                (2, src.qtbenhly),
                (3, src.bophan)
            ) t(ord, val)
        WHERE COALESCE(val,'') <> ''
  ),
-- 2) Nở maicdp / kqcdoanp thành nhiều dòng (chỉ dùng khi thật sự có dữ liệu phụ)
diag_sub AS (      
    SELECT d.*,
           m.idx                  AS idx_diag,          -- vị trí phần tử
           m.macd,                                      -- mã ICD phụ
           COALESCE(k.chandoan,'') AS kqcdoanp_split     -- diễn giải phụ khớp chỉ số
    FROM data d
    CROSS JOIN LATERAL                    -- tách maicdp thành mảng
         unnest(string_to_array(d.maicdp,';')) WITH ORDINALITY AS m(macd,idx)
    LEFT  JOIN LATERAL                    -- tách kqcdoanp rồi “zip” theo idx
         ( SELECT chandoan, idx2
           FROM   unnest(string_to_array(d.kqcdoanp,';'))
                        WITH ORDINALITY AS k(chandoan,idx2)
         ) k ON k.idx2 = m.idx
),
-- 3) Gom các loại chẩn đoán vào chung một CTE
json_data_raw AS (
    /* ---- Chẩn đoán YHCT -------------------------------------------------- */
    SELECT  d.iddienbien, d.mabn, d.maba, d.makb,
            ngaygio, madv, manv, chamsoc, dienbien,
            kqcdoan, kqcdoanp, tenyhct,               -- giữ nguyên
            mayhct      AS macd,
            tenyhct     AS chandoan,
            2           AS loai,          -- YHCT
            false       AS smain,
            mach, huyetap, nhiptho, nhietdo, cannang,
            chieucao, hb, fio2, maphong, sogiuong,
            'Mạch (lần/phút): '||mach||', Nhiệt độ (°C): '||nhietdo||
            ', Huyết áp (mmHg): '||huyetap||
            ', Nhịp thở (lần/phút): '||nhiptho||
            ', Cân nặng (kg): '||cannang||
            ', Chiều cao (m): '||chieucao  AS VitalSignCommand,
            buong
    FROM data d
    WHERE COALESCE(tenyhct,'') <> ''

    UNION ALL
    /* ---- Chẩn đoán hiện đại – chính -------------------------------------- */
    SELECT  d.iddienbien, d.mabn, d.maba, d.makb,
            ngaygio, madv, manv, chamsoc, dienbien,
            kqcdoan, kqcdoanp, tenyhct,
            maicd       AS macd,
            kqcdoan     AS chandoan,
            1           AS loai,          -- hiện đại
            true        AS smain,
            mach, huyetap, nhiptho, nhietdo, cannang,
            chieucao, hb, fio2, maphong, sogiuong,
            'Mạch (lần/phút): '||mach||', Nhiệt độ (°C): '||nhietdo||
            ', Huyết áp (mmHg): '||huyetap||
            ', Nhịp thở (lần/phút): '||nhiptho||
            ', Cân nặng (kg): '||cannang||
            ', Chiều cao (m): '||chieucao  AS VitalSignCommand,
            buong
    FROM data d

    UNION ALL
    /* ---- Chẩn đoán hiện đại – phụ (đã tách) ------------------------------ */
    SELECT  ds. iddienbien, ds.mabn, ds.maba, ds.makb,
            ngaygio, madv, manv, chamsoc, dienbien,
            kqcdoan       AS kqcdoan,          -- chính (có thể rỗng)
            ds.kqcdoanp_split AS kqcdoanp,     -- diễn giải phụ sau tách
            tenyhct,
            ds.macd,                           -- mã ICD phụ rời
            ds.kqcdoanp_split AS chandoan,     -- diễn giải trùng khớp
            1            AS loai,              -- hiện đại
            false        AS smain,
            mach, huyetap, nhiptho, nhietdo, cannang,
            chieucao, hb, fio2, maphong, sogiuong,
            'Mạch (lần/phút): '||mach||', Nhiệt độ (°C): '||nhietdo||
            ', Huyết áp (mmHg): '||huyetap||
            ', Nhịp thở (lần/phút): '||nhiptho||
            ', Cân nặng (kg): '||cannang||
            ', Chiều cao (m): '||chieucao  AS VitalSignCommand,
            buong
    FROM diag_sub ds
),

-- 4) Đánh số thứ tự để build JSON diagnois
json_data AS (
    SELECT jdr.*,
           ROW_NUMBER() OVER (
               PARTITION BY jdr.mabn, jdr.maba, jdr.makb, jdr.iddienbien
               ORDER BY loai /* YHCT=2 sẽ xếp sau */ , smain DESC
           ) AS stt
    FROM json_data_raw jdr
)

/* ========================== */
    
  SELECT json_build_object(
    /* --- Thông tin chung ------------------------------------------ */
           'TPCode',                dtf.iddienbien,
           'PatientCode',           dtf.mabn,
           'AdmissionCode',         dtf.makb,
           'MedicalRecordNo',       dtf.maba,
           'TPDate',                to_char(ngaygio AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD"T"HH24:MI:SS'),
           'TreatmentDoctorCode',   manv,
           'DepartmentCode',        madv,
           'ParaClinicalResultCommand', '',
           'VitalSignCommand',      VitalSignCommand,
           'RiskOfFalling',         0,
           'TakeCare',              0,
           'FollowUpCommand',       chamsoc,
           'MethodOfTreatmentCommand', '',
           'NutritionCommand',      '',
           'Infor',                 CASE 
                                        WHEN COALESCE(dienbien,'') <> '' THEN dienbien
                                        ELSE(SELECT infor_fallback FROM adm_info)
                                   END,
           'DiseaseName',           '',
           'IsNotChange',           false,
           'FileDocID',             '',
           'FilePath',              '',
           'SignStatus',            0,
           'Reason',                '',
           /* Gộp mô tả chính + phụ đã tách (nên dùng string_agg) ----------- */
           'DiagnosisDesc',
                 kqcdoan || ',' ||
                 (SELECT string_agg(DISTINCT kqcdoanp, '; ')
                    FROM json_data jd2
                    WHERE jd2.iddienbien = dtf.iddienbien),
           'DiagnosisTraditionalDesc', tenyhct,
           'DiagnosisOtherDesc',     '',
           /* --- Vital Sign ----------------------------------------------- */
           'VitalSign', json_build_object(
               'ExecutorCode',          manv,
               'BloodPressureSystolic', CASE WHEN position('/' in huyetap) > 0
                                             THEN COALESCE(NULLIF(substring(split_part(huyetap, '/', 1) from '^[0-9]+'), '')::numeric, 0)
                                        ELSE 0 END,
               'BloodPressureDiastolic',CASE WHEN position('/' in huyetap) > 0
                                             THEN COALESCE(NULLIF(substring(split_part(huyetap, '/', 2) from '^[0-9]+'), '')::numeric, 0)
                                        ELSE 0 END, --[ÔNG TRIỆU HẬU - 2025-08-09] Xử lý để không lỗi khi nhập sai, trường hợp sai: 100/70-
               'BreathBeat',            COALESCE(nhiptho,0),
               'BodyTemperature',       COALESCE(nhietdo,0),
               'Weight',                COALESCE(cannang,0),
               'Height',                COALESCE(chieucao,0),
               'Hb',                    hb,
               'FiO2',                  fio2,
               'Pulse',                 COALESCE(mach,0)
           ),
           /* --- Danh sách chẩn đoán -------------------------------------- */
           'Diagnosis', json_agg(
               json_build_object(
                   'OrderNum',        stt,
                   'DiagnosisICDCode',macd,
                   'DiagnosisDesc',   chandoan,
                   'DiagnosisType',   loai,
                   'IsMain',          smain
               )
               ORDER BY stt
           ),
            -- [ÔNG TRIỆU HẬU - 2025-10-01]: Bổ sung các thông tin giường bệnh lên EMR, khi gửi tờ điều trị 
            -- NT.sogiuong AS BedName, --[ÔNG TRIỆU HẬU]
            -- NT.buong AS RoomName, --[ÔNG TRIỆU HẬU]
            -- COALESCE(NULLIF(NT.maphong, ''), NT.buong) as RoomNo, --Phòng
            -- NT.sogiuong as BedNo, --Giường
           'BedName',                dtf.sogiuong,
           'RoomName',               COALESCE(dtf.buong,''),
           'RoomNo',                 COALESCE(NULLIF(dtf.maphong, ''), dtf.sogiuong),
           'BedNo',                  dtf.sogiuong
       ) INTO result
  FROM json_data dtf
  GROUP BY dtf.iddienbien, dtf.mabn, dtf.maba, dtf.makb, ngaygio,
         madv, manv, chamsoc, dienbien, kqcdoan,
         VitalSignCommand, tenyhct, huyetap, nhiptho,
         nhietdo, cannang, chieucao, hb, fio2, mach,
         dtf.sogiuong, dtf.buong, dtf.maphong;
    RETURN result;
END;
$$;