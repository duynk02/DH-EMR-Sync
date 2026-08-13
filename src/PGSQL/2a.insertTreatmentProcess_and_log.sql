-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-06-19
-- Hàm: badt_dhs.insertTreatmentProcess_Thuoc_CLS(input_json JSONB)
-- Mô tả:
--   - input_json: nội dung file json: quá trình điều trị có thuốc và cls
-- Sử dụng:
--   SELECT badt_dhs.insertTreatmentProcess(input_json JSONB);  --Insert vào current.qtdieutri từ DHS
--   Nếu có thuốc gọi hàm insert thuốc (inserttpprescription)
--   Nếu có cls gọi hàm inser cls(insertcutpparaclinrequest)
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.insertTreatmentProcess(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
    TPCode TEXT; --Mã tờ điều trị: iddienbien
    PatientCode TEXT;--Mã bệnh nhân: mabn
    AdmissionCode TEXT;--Mã tiếp nhận: makb
    MedicalRecordNo TEXT;--Mã bệnh án
    TPDate TIMESTAMP; --Ngày tờ điều trị: ngaygio
    TreatmentDoctorCode TEXT;--Mã số bs chỉ định điều trị: manv
    DepartmentCode TEXT;--Mã khoa chỉ định điều trị:madv
    ParaClinicalResultCommand TEXT;
    VitalSignCommand TEXT; --Chỉ số sinh hiệu
    RiskOfFalling INT; --Té ngã: 1-Thấp, 2-Cao, 3-Trung bình
    TakeCare INT; --Chế độ chăm sóc: 1-Cấp 1, 2-Cấp 2, 3-Cấp 3
    FollowUpCommand TEXT;--Chăm sóc: chamsoc
    MethodOfTreatmentCommand TEXT;
    NutritionCommand TEXT;
    Infor TEXT; --Diễn biến: dienbien
    DiseaseName TEXT;
    IsNotChange BOOLEAN := FALSE;
    FileDocID TEXT;
    FilePath TEXT;
    SignStatus INT := 0;--Trạng thái
    Reason TEXT;--Lý do hủy
    DiagnosisDesc TEXT; --Chẩn đoán hiện đại: kqcdoan || ',' || kqcdoanp
    DiagnosisICDName TEXT; -- [ÔNG TRIỆU HẬU: 2025-08-11]: Đồng bộ dữ liệu ICD >> Theo HIS đề xuất, EMR có bổ sung 1 field DiagnosisICDName >> HIS lấy field này thay cho DiagnosisDesc như hiện tại
                        -- ![](https://live.staticflickr.com/65535/54713027112_36fd840249_b.jpg)
    DiagnosisTraditionalDesc TEXT;--Chẩn đoán YHCT: tenyhct
    DiagnosisOtherDesc TEXT;
    Prescriptions JSONB; --Thông tin thuốc
    ParaClinRequests JSONB; --Thông tin CLS
    Diagnosis JSONB; -- Thông tin chẩn đoán

    VitalSign JSONB; -- Dấu hiệu sinh tồn
    VSDate TIMESTAMP; --Ngày giờ ghi nhận dấu hiệu sinh tồn
    ExecutorCode TEXT; --Mã nhân viên thực hiện
    ExecutorName TEXT; --Tên nhân viên thực hiện

    Height NUMERIC; --: 120.0, Chiều cao của bệnh nhân (cm)
    Weight NUMERIC; --": 40.0, Cân nặng của bệnh nhân (kg)
    BMI NUMERIC; --": 27.8, Chỉ số khối cơ thể (BMI)
    BloodPressureSystolic INT; --": 140.0, Huyết áp tâm thu (mmHg)
    BloodPressureDiastolic INT;--: 100.0, Huyết áp tâm trương (mmHg)
    BodyTemperature NUMERIC; --": 37.0,Nhiệt độ cơ thể (°C)
    Pulse NUMERIC; --": 59.0,Nhịp tim (lần/phút)
    BreathBeat NUMERIC; --": 20.0, Nhịp thở (lần/phút)
    SpO2 NUMERIC; --": 99.0, Độ bão hòa oxy trong máu (%)
    Para TEXT;
    I_RHType INT; --Loại Rh máu (1: Rh+, 2: Rh-)
    I_BloodType INT; --Nhóm máu (1: A, 2: B, 3: AB, 4: O, 5: Chưa xác định)

    --noitru
    nt_maphong TEXT := NULL;
    nt_sogiuong TEXT := NULL;
    nt_huyetap TEXT := NULL;

    thangnam TEXT;
    thangkt_S TEXT; -- thangkt, lấy cho đủ số liệu, toa thuốc mới lên module
    namkt_S TEXT; --namkt, lấy cho đủ số liệu, toa thuốc mới lên module

    dt_maicd TEXT := NULL;
    dt_kqcdoan TEXT := NULL;

    dt_mayhct TEXT := NULL;
    dt_tenyhct TEXT := NULL;
    
    record_exists BOOLEAN := FALSE;
    insert_success BOOLEAN := TRUE;
    
    -- Phụ: gom chuỗi bằng dấu ;
    dt_maicdp_arr TEXT[] := ARRAY[]::TEXT[];
    dt_kqcdoanp_arr TEXT[] := ARRAY[]::TEXT[];
    dt_maicdp TEXT := NULL;
    dt_kqcdoanp TEXT := NULL;
    
    -- Biến dùng để bắt lỗi
    v_err_context TEXT;
    v_err_msg TEXT;

    -- Biến kiểm tra ICD 
    missing_icds TEXT[];
    BedNo TEXT := NULL;
    CurrentDateTime timestamptz;
    
    --Biến kiểm tra số lượng ICD
    ma_benh_kt_soluong Numeric :=0;
    icds TEXT := '';
    icds2 TEXT := '';
    icd_count Numeric :=0;
    icd_count2 Numeric :=0;
    r_bnnoitru RECORD;
    nt_magiuong TEXT:='';
	IsInsertGB BOOLEAN := FALSE;
    --
BEGIN
    TPCode := input_json->>'TPCode';
    PatientCode := input_json->>'PatientCode';
    AdmissionCode := input_json->>'AdmissionCode';
    MedicalRecordNo := input_json->>'MedicalRecordNo';
    TreatmentDoctorCode := input_json->>'TreatmentDoctorCode';
    Infor := input_json->>'Infor';
    BedNo := input_json->>'BedNo';
    TPDate := (input_json->>'TPDate')::timestamptz;

    CurrentDateTime := NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh';
    -- Thử cập nhật 
    --[ÔNG TRIỆU HẬU: 2025-09-26] Nếu ngày diễn biến (TPDate) lớn hơn ngày server thì chặn lại 
    --  ![](https://storage.googleapis.com/accurately-sharp-katydid.appspot.com/ShareX/2025/09/DESKTOP-2FLMTI6-%25pn-2025-09-26-09h47p19.526.png) 
    /* --[ÔNG TRIỆU HẬU: 2025-10-27] Tạm ngưng
    IF TPDate > CurrentDateTime THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Ngày diễn biến (TPDate): %s - Không thể lớn hơn ngày hiện tại: %s. (Mabn: %L, Makb: %L, Maba: %L)', 
                TO_CHAR(TPDate AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS'),
                TO_CHAR(CurrentDateTime, 'YYYY-MM-DD HH24:MI:SS'),
                PatientCode, AdmissionCode, MedicalRecordNo)
        );
    END IF;
    */
    ----[ntvuong: 2025-10-03] Kiểm tra mã giường (BedNo) null
    /*
    IF COALESCE(BedNo,'')='' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mã giường (BedNo): Không thể rỗng.')
        );
    END IF;
    */
    ----[ntvuong: 2025-10-09] Kiểm tra (VitalSign) null
    IF NOT (input_json ? 'VitalSign') 
    	OR input_json->'VitalSign' IS NULL 
        OR input_json->'VitalSign' = 'null'::jsonb
        OR input_json->'VitalSign' = '""'::jsonb
        OR input_json->'VitalSign' = '[]'::jsonb
        THEN
        RETURN jsonb_build_object(
            'status','error',
            'message','Chưa nhập (VitalSign) cho người bệnh!'
        );
    END IF;
    ----[ntvuong: 2025-10-03] Kiểm tra trùng mã giường (BedNo)
    SELECT giatri INTO nt_magiuong FROM current.system WHERE tents = 'nt.magiuong';
    
    ----[ntvuong: 2025-12-03] Lấy tên khoa
    SELECT nt.*, dv.tendv
    INTO r_bnnoitru
    FROM current.bnnoitru nt
    	INNER JOIN current.dmdonvi dv ON nt.madv = dv.madv
    WHERE mabn = PatientCode AND makb = AdmissionCode AND maba = MedicalRecordNo ;

   --[ntvuong: 2026-03-05] Kiểm tra mã giường (BedNo) có thuộc khoa (r_bnnoitru.madv) hay không?
  IF COALESCE(r_bnnoitru.namvien,0) > 0 THEN
     IF NOT EXISTS ( 
              SELECT 1
              FROM current.dmgiuongbenh 
              WHERE COALESCE(ma_giuong,'') = COALESCE(BedNo,'')
                  AND madv = r_bnnoitru.madv
                  AND COALESCE(sudung,0) = 0
              
            ) THEN
                RETURN jsonb_build_object('status', 'error', 'message', 
                    format('Mã giường (BedNo): %s, KHÔNG thuộc khoa [%s]: %s !',BedNo,COALESCE(r_bnnoitru.madv,''),r_bnnoitru.tendv)
          );
      END IF;
   END IF;
    
	--1.Kiểm tra mã giường có BN khác sử dụng chưa?
	IF COALESCE(BedNo,'') <> '' THEN 
    IF EXISTS (
        SELECT 1 
        FROM current.dmgiuongbenh 
        WHERE COALESCE(madv,'') = COALESCE(r_bnnoitru.madv,'')
          AND COALESCE(ma_giuong,'') = COALESCE(BedNo,'')
          AND COALESCE(mabn,'') != PatientCode
          AND COALESCE(maba,'') != MedicalRecordNo
          AND COALESCE(mabn,'') != ''
          AND COALESCE(maba,'') != ''
    ) THEN
        IF nt_magiuong = '2' THEN
            RETURN jsonb_build_object(
                'status', 'error',
                'message',
                format('Mã giường (BedNo): %s thuộc khoa: %s, đã có người bệnh khác sử dụng!',BedNo,COALESCE(r_bnnoitru.madv,'')
                )
            );
        END IF;
    ELSE
		IF (nt_magiuong = '1' OR nt_magiuong = '2') THEN 
			IsInsertGB = true;
		END IF;
    END IF;
END IF;
    --RAISE NOTICE 'BedNo: %, madv:%, mabn: %, makba: %', BedNo,COALESCE(r_bnnoitru.madv,''), PatientCode, MedicalRecordNo;
        
    --[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra diễn biến rỗng, ảnh hưởng XML08
    IF COALESCE(Infor,'')='' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Diễn biến (Infor): Không thể rỗng. (Mabn: %L, Makb: %L, Maba: %L)', 
            PatientCode, AdmissionCode, MedicalRecordNo)
        );
    END IF;

    --[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra trạng thái ra viện
    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = PatientCode AND makb = AdmissionCode AND maba = MedicalRecordNo AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            PatientCode, AdmissionCode, MedicalRecordNo)
        );
    END IF;
    
    -- Kiểm tra 
    IF NOT EXISTS (
        SELECT 1 FROM current.dmnhanvien
        WHERE manv = TreatmentDoctorCode AND COALESCE(macc_hanhnghe_cv2348,'') != '' AND COALESCE(trangthai,'') = '1'
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', format('TreatmentDoctorCode: %s không tồn tại trong HIS (Điều kiện: Phải có CCHN và trạng thái đang làm việc.)', TreatmentDoctorCode));
    END IF;
    --[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra tồn tại ICD
    IF input_json ? 'Diagnosis' AND jsonb_array_length(input_json->'Diagnosis') > 0 THEN
        
            /* Gom tất cả ICD code (DiagnosisType=1) rồi kiểm tra một lần */
        WITH dx AS (
            SELECT DISTINCT
                   (d->>'DiagnosisICDCode')::text AS icd_code
            FROM jsonb_array_elements(input_json->'Diagnosis') AS d
            WHERE COALESCE((d->>'DiagnosisType')::int, 0) = 1
              AND NULLIF(d->>'DiagnosisICDCode','') IS NOT NULL
        ),
        missing AS (
            SELECT dx.icd_code
            FROM dx
            LEFT JOIN current.dmicd m
                   ON m.maicd = dx.icd_code AND COALESCE(m.xoa,0)=0
            WHERE m.maicd IS NULL
        )
        SELECT ARRAY_AGG(icd_code)
        INTO missing_icds
        FROM missing;

        IF missing_icds IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 
                format('ICD code (DiagnosisType=1) không tồn tại hoặc ngưng sử dụng trong current.dmicd: %L', missing_icds));
        END IF;

    END IF;

    --[ÔNG TRIỆU HẬU: 2025-09-13] Kiểm tra tồn tại ICD YHCT
    IF input_json ? 'Diagnosis' AND jsonb_array_length(input_json->'Diagnosis') > 0 THEN
        
            /* Gom tất cả ICD code (DiagnosisType=1) rồi kiểm tra một lần */
        WITH dx AS (
            SELECT DISTINCT
                   (d->>'DiagnosisICDCode')::text AS icd_code
            FROM jsonb_array_elements(input_json->'Diagnosis') AS d
            WHERE COALESCE((d->>'DiagnosisType')::int, 0) = 2
              AND NULLIF(d->>'DiagnosisICDCode','') IS NOT NULL
        ),
        missing AS (
            SELECT dx.icd_code
            FROM dx
            LEFT JOIN current.dmbyt_benhyhct m
                   ON m.ma_yhct = dx.icd_code
            WHERE m.ma_yhct IS NULL
        )
        SELECT ARRAY_AGG(icd_code)
        INTO missing_icds
        FROM missing;

        IF missing_icds IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 
                format('ICD code (DiagnosisType=2) không tồn tại hoặc ngưng sử dụng trong current.dmbyt_benhyhct: %L', missing_icds));
        END IF;

    END IF;

    --[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra tồn tại macls
    IF input_json ? 'ParaClinRequests' AND jsonb_array_length(input_json->'ParaClinRequests') > 0 THEN
        
        WITH dx AS (
            SELECT DISTINCT
                   (d->>'MedSerCode')::text AS macls_code
            FROM jsonb_array_elements(input_json->'ParaClinRequests') AS d
            WHERE NULLIF(d->>'MedSerCode','') IS NOT NULL
        ),
        missing AS (
            SELECT dx.macls_code
            FROM dx
            LEFT JOIN current.dmcls m
                   ON m.macls = dx.macls_code AND COALESCE(m.sudung,0)=1 AND COALESCE(m.tt37,0)=1
            WHERE m.macls IS NULL
        )
        SELECT ARRAY_AGG(macls_code)
        INTO missing_icds
        FROM missing;

        IF missing_icds IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 
                format('MedSerCode code không tồn tại hoặc ngưng sử dụng trong current.dmcls: %L', missing_icds));
        END IF;

    END IF;

    SELECT EXISTS (
        SELECT 1 FROM current.qtdieutri WHERE iddienbien = TPCode AND mabn = PatientCode AND makb = AdmissionCode AND maba = MedicalRecordNo
    ) INTO record_exists;

    
    DepartmentCode := input_json->>'DepartmentCode';
    ParaClinicalResultCommand := input_json->>'ParaClinicalResultCommand';
    VitalSignCommand := input_json->>'VitalSignCommand';
    RiskOfFalling := input_json->>'RiskOfFalling';
    TakeCare := input_json->>'TakeCare';
    FollowUpCommand := input_json->>'FollowUpCommand';
    MethodOfTreatmentCommand := input_json->>'PatientCode';
    NutritionCommand := input_json->>'NutritionCommand';
    
    DiseaseName := input_json->>'DiseaseName';
    IsNotChange := (input_json->>'IsNotChange')::BOOLEAN;
    FileDocID := input_json->>'FileDocID';
    FilePath := input_json->>'FilePath';
    SignStatus := (input_json->>'SignStatus')::INT;
    Reason := input_json->>'Reason';
    DiagnosisDesc := input_json->>'DiagnosisDesc';
    DiagnosisICDName := input_json->>'DiagnosisICDName';
    DiagnosisTraditionalDesc := input_json->>'DiagnosisTraditionalDesc';
    DiagnosisOtherDesc := input_json->>'DiagnosisOtherDesc';

    Height := (input_json->'VitalSign'->>'Height')::numeric;
    Weight := (input_json->'VitalSign'->>'Weight')::numeric;
    BMI := (input_json->'VitalSign'->>'BMI')::numeric;
    BloodPressureSystolic := (input_json->'VitalSign'->>'BloodPressureSystolic')::numeric;
    BloodPressureDiastolic := (input_json->'VitalSign'->>'BloodPressureDiastolic')::numeric;
    BodyTemperature := (input_json->'VitalSign'->>'BodyTemperature')::numeric;
    Pulse := (input_json->'VitalSign'->>'Pulse')::numeric;
    BreathBeat := (input_json->'VitalSign'->>'BreathBeat')::numeric;
    SpO2 := (input_json->'VitalSign'->>'SpO2')::numeric;
    Para := (input_json->'VitalSign'->>'Para');
    I_RHType := (input_json->'VitalSign'->>'I_RHType')::numeric;
    I_BloodType := (input_json->'VitalSign'->>'I_BloodType')::numeric;

    nt_huyetap := BloodPressureSystolic || '/' || BloodPressureDiastolic;

    -- Xử lý chẩn đoán
    FOR Diagnosis IN SELECT value FROM jsonb_array_elements(COALESCE(input_json->'Diagnosis','[]')) AS value
    LOOP
        IF (Diagnosis->>'DiagnosisType')::INT = 2 THEN
            dt_mayhct := Diagnosis->>'DiagnosisICDCode';
            -- [ÔNG TRIỆU HẬU: 2025-08-11] Ưu tiên lấy DiagnosisICDName, nếu không có thì lấy DiagnosisDesc
            -- dt_tenyhct := Diagnosis->>'DiagnosisDesc';
            -- [ÔNG TRIỆU HẬU - 2025-08-14]: Đổi lại lấy theo DiagnosisDesc ![](https://live.staticflickr.com/65535/54720329188_0d06fb44e4_b.jpg)
            dt_tenyhct := COALESCE(
                        Diagnosis->>'DiagnosisDesc',
                        NULLIF(TRIM(Diagnosis->>'DiagnosisICDName'), '')                        
                    );
            
        ELSE
            IF (Diagnosis->>'IsMain')::BOOLEAN THEN
                dt_maicd := Diagnosis->>'DiagnosisICDCode';
                -- [ÔNG TRIỆU HẬU: 2025-08-11] Ưu tiên lấy DiagnosisICDName, nếu không có thì lấy DiagnosisDesc
                -- dt_kqcdoan := Diagnosis->>'DiagnosisDesc';
                dt_kqcdoan := COALESCE(
                        Diagnosis->>'DiagnosisDesc',
                        NULLIF(TRIM(Diagnosis->>'DiagnosisICDName'), '')                        
                    );
                
            ELSE
                --Chẩn đoán phụ               
                dt_maicdp_arr   := array_append(dt_maicdp_arr,   Diagnosis->>'DiagnosisICDCode');
                -- [ÔNG TRIỆU HẬU: 2025-08-11] Ưu tiên lấy DiagnosisICDName, nếu không có thì lấy DiagnosisDesc
                -- dt_kqcdoanp_arr := array_append(dt_kqcdoanp_arr, Diagnosis->>'DiagnosisDesc');
                dt_kqcdoanp_arr := array_append(dt_kqcdoanp_arr, 
                    COALESCE(
                        Diagnosis->>'DiagnosisDesc',
                        NULLIF(TRIM(Diagnosis->>'DiagnosisICDName'), '')                        
                    )
                );				
            END IF;
        END IF;
    END LOOP;
	
    dt_maicdp   := array_to_string(dt_maicdp_arr, ';'); 
    dt_kqcdoanp := array_to_string(dt_kqcdoanp_arr, ';');
    
    --[2026-01-09:Ông Triệu Hậu]: Bỏ các kiểm tra tồn tại các cột api trong qtdieutri,chungtu,chidinhcls
    
    -- Lấy tháng/năm kế toán
    SELECT giatri INTO thangnam FROM current.system WHERE tents = 'thanglv';
    thangkt_S := SPLIT_PART(thangnam, '/', 1);
    namkt_S := SPLIT_PART(thangnam, '/', 2);

     -- Lấy thông tin nội trú
    SELECT maphong, sogiuong INTO nt_maphong, nt_sogiuong -- lấy cho đủ số liệu
    FROM current.bnnoitru
    WHERE mabn = PatientCode AND maba = MedicalRecordNo AND makb = AdmissionCode;
    
    -----------------------------------
    -----------------------------------
    --Kiểm tra số lượng ICD có vượt cấu hình không
    --[Vương] 30/09/2025
    SELECT COALESCE(NULLIF(giatri, ''), '0') AS giatri INTO ma_benh_kt_soluong FROM current.system WHERE tents = 'ma_benh_kt.soluong';
    
    SELECT 
        CASE WHEN TRIM(BOTH ';' FROM string_agg(DISTINCT val, ';')) IS NULL 
                  OR TRIM(BOTH ';' FROM string_agg(DISTINCT val, ';')) = '' 
            THEN '0'
            ELSE TRIM(BOTH ';' FROM string_agg(DISTINCT val, ';')) END,
        COUNT(DISTINCT val),
        CASE WHEN TRIM(BOTH ';' FROM string_agg(DISTINCT val2, ';')) IS NULL 
                  OR TRIM(BOTH ';' FROM string_agg(DISTINCT val2, ';')) = '' 
            THEN '0'
            ELSE TRIM(BOTH ';' FROM string_agg(DISTINCT val2, ';')) END,
        COUNT(DISTINCT val2) 
    INTO icds, icd_count, icds2, icd_count2
    FROM (
        SELECT 
            unnest(string_to_array(maicd || ';' || maicdp, ';')) AS val,
            unnest(string_to_array(maicd || ';' || maicdp, ';')) AS val2
        FROM    current.qtdieutri a
        WHERE   a.mabn = PatientCode
            AND a.maba = MedicalRecordNo
            AND a.makb = AdmissionCode
            --[ÔNG TRIỆU HẬU: 2025-10-18]: Bổ sung điều kiện ma_benh_kt.soluong.noitru <> 1 mới kiểm tra toàn bộ qtdieutri
            AND EXISTS (
                SELECT 1
                FROM current.system s
                WHERE s.tents = 'ma_benh_kt.soluong.noitru'
                    AND COALESCE(NULLIF(s.giatri, ''), '0') <> '1'
            )
        UNION ALL
        SELECT 
            unnest(string_to_array(dt_maicd || ';' || dt_maicdp, ';')) AS val,
            NULL AS val2
    ) tam
    WHERE val <> '';
    
    IF icd_count > ma_benh_kt_soluong + 1 THEN
    	RETURN jsonb_build_object('status', 'error', 'message', 
                format('Số lượng ICD %s vượt quá số lượng cấu hình %s', icd_count,ma_benh_kt_soluong + 1));
    END IF;
    -----------------------------------
    -----------------------------------
    -- Thực hiện insert/update

    BEGIN
        IF record_exists THEN
            UPDATE current.qtdieutri
            SET manv = TreatmentDoctorCode,
                ngaygio = TPDate,
                dienbien = Infor,
                maicd = dt_maicd,
                kqcdoan = dt_kqcdoan,
                maicdp = dt_maicdp,
                kqcdoanp = dt_kqcdoanp,
                madv = DepartmentCode,
                mayhct = dt_mayhct,
                tenyhct = dt_tenyhct,
                chamsoc = FollowUpCommand,
                maphong = nt_maphong,
                sogiuong = BedNo,
                ma_giuong = BedNo,
                api = 1,
                huyetap = nt_huyetap,
                nhiptho = BreathBeat,
                nhietdo = BodyTemperature,
                mach = Pulse,
                chieucao = Height/100.0,
                cannang = Weight
            WHERE iddienbien = TPCode AND mabn = PatientCode and maba = MedicalRecordNo AND makb = AdmissionCode;
        ELSE
            INSERT INTO current.qtdieutri(
                mabn, makb, maba, manv, ngaygio,
                dienbien, maicd, kqcdoan, maicdp, kqcdoanp,
                madv, iddienbien, mayhct, tenyhct, chamsoc, api, thangkt, namkt, maphong,
                ma_giuong, huyetap, nhiptho, nhietdo, mach, chieucao, cannang, sogiuong
            )
            VALUES (
                PatientCode, AdmissionCode, MedicalRecordNo, TreatmentDoctorCode, TPDate,
                Infor, dt_maicd, dt_kqcdoan, dt_maicdp, dt_kqcdoanp,
                DepartmentCode, TPCode, dt_mayhct, dt_tenyhct, FollowUpCommand, 1, thangkt_S, namkt_S, nt_maphong,
                BedNo, nt_huyetap, BreathBeat, BodyTemperature, Pulse, Height/100.0, Weight, BedNo
            );
        END IF;

        --Update bnnoitru
        UPDATE current.bnnoitru
            SET manv = TreatmentDoctorCode,
                iddienbien = TPCode,
                ngaykcb = TPDate,
                dienbien = Infor,
                maicd = dt_maicd,
                kqcdoan = dt_kqcdoan,
                maicdp = dt_maicdp,
                kqcdoanp = dt_kqcdoanp,
                --[ÔNG TRIỆU HẬU: 2025-09-28]: Không cập nhật lại madv, ảnh hưởng tới danh sách đang điều trị tại HIS
                -- ![](https://i.vgy.me/3FYenN.png)
                --madv = DepartmentCode,
                mayhct = dt_mayhct,
                tenyhct = dt_tenyhct,
                chamsoc = FollowUpCommand,
                huyetap = nt_huyetap,
                nhiptho = BreathBeat,
                nhietdo = BodyTemperature,
                mach = Pulse,
                chieucao = Height/100.0,
                cannang = Weight,
                maphong = nt_maphong,
                sogiuong = BedNo
            WHERE mabn = PatientCode and maba = MedicalRecordNo AND makb = AdmissionCode;

        --Update ttcon (mã thẻ 2)
        UPDATE current.ttcon
            SET manv = TreatmentDoctorCode,
                iddienbien = TPCode,
                maicd = dt_maicd,
                kqcdoan = dt_kqcdoan,
                maicdp = dt_maicdp,
                kqcdoanp = dt_kqcdoanp,
                mayhct = dt_mayhct,
                tenyhct = dt_tenyhct
            WHERE mabnme = PatientCode and mabame = MedicalRecordNo AND COALESCE(loaitt,0) = 1;
		
		--[NTV 31/03/2026: Bổ sung thêm mã giường và danh mục giường bệnh]
		IF (IsInsertGB) THEN 
        	UPDATE current.dmgiuongbenh 
                SET mabn = '', maba = ''
            WHERE COALESCE(madv,'') = COALESCE(r_bnnoitru.madv,'')
                AND COALESCE(ma_giuong,'') != COALESCE(BedNo,'')
                AND COALESCE(mabn,'') = PatientCode
                AND COALESCE(maba,'') = MedicalRecordNo;
			UPDATE current.dmgiuongbenh 
				SET mabn = PatientCode, maba = MedicalRecordNo
			WHERE COALESCE(madv,'') = COALESCE(r_bnnoitru.madv,'')
				AND COALESCE(ma_giuong,'') = COALESCE(BedNo,'')
				AND COALESCE(mabn,'') = ''
				AND COALESCE(maba,'') = '';
		END IF;

        -- Gọi hàm thêm thuốc nếu có
        IF jsonb_array_length(COALESCE(input_json->'Prescriptions', '[]'::jsonb)) > 0 THEN
            PERFORM badt_dhs.inserttpprescription(input_json);
        END IF;

        -- Gọi hàm thêm CLS nếu có
        IF jsonb_array_length(COALESCE(input_json->'ParaClinRequests', '[]'::jsonb)) > 0 THEN
            PERFORM badt_dhs.insertcutpparaclinrequest(input_json);
        END IF;

        RETURN jsonb_build_object('status', 'success', 'message', '');

    EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            v_err_context = PG_EXCEPTION_CONTEXT,
            v_err_msg = MESSAGE_TEXT;

        RETURN jsonb_build_object(
            'status', 'error',
            'message', v_err_msg
        );
    END;

END;
$$ LANGUAGE plpgsql;

