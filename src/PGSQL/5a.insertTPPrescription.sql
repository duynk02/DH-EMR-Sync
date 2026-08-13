-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-06-10
-- Hàm: badt_dhs.insertTPPrescription(input_json JSONB)
-- Mô tả:
--   - input_json: nội dung file json được get về từ ...
-- Sử dụng:
--   SELECT badt_dhs.insertTPPrescription(input_json JSONB);  --Insert,update vào current.chungtu, current.pshdxn, current.pstonkho từ DHS
-- ===============================================================
--json mẫu

-- ===============================================================
-- Tạo bảng ghi log lỗi
CREATE TABLE IF NOT EXISTS badt_dhs.insert_log (
    id SERIAL PRIMARY KEY,
    tpc_code TEXT,             -- Mã tờ điều trị (iddienbien)
    patient_code TEXT,         -- Mã bệnh nhân
    admission_code TEXT,       -- Mã tiếp nhận
    error_message TEXT,        -- Nội dung lỗi
    error_detail TEXT,         -- Chi tiết lỗi nếu cần
    log_time TIMESTAMP DEFAULT now(), -- Thời gian lỗi
    raw_json JSONB             -- Dữ liệu đầu vào
);

--================================================================
CREATE OR REPLACE FUNCTION badt_dhs.insertTPPrescription(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
    TPCode TEXT := input_json->>'TPCode'; --mã tờ điều trị: iddienbien
    AdmissionCode TEXT := input_json->>'AdmissionCode'; --makb
    MedicalRecordNo TEXT := input_json->>'MedicalRecordNo'; -- maba
    PatientCode TEXT := input_json->>'PatientCode'; --mabn
    EmployeeCode TEXT := input_json->>'EmployeeCode'; --manv
    TreatmentDoctorCode TEXT:= input_json->>'TreatmentDoctorCode'; --manv: chỉ định diễn biến
    PresCode TEXT := input_json->>'PresCode'; --sohd
    --ngay_uong INT := COALESCE((input_json->>'DatOfUse')::NUMERIC, 0);
    ngay TIMESTAMP:= input_json->>'Ngay';
    voucherdate_text TEXT:= input_json->>'VoucherDate'; --VoucherDate: Ngày phiếu thuốc. => ngayhd
    --voucherdate TIMESTAMP:= input_json->>'VoucherDate'; --VoucherDate: Ngày phiếu thuốc. => ngayhd
    isdischarge BOOLEAN:= input_json->>'IsDischarge'; -->> TRUE: Toa xuất viện, FALSE: toa bình thường
    IsHI_CT BOOLEAN:= input_json->>'IsHI'; -->> TRUE: Toa BH, FALSE: TOA TP
    strtoamo TEXT := CASE WHEN COALESCE(lower(input_json->>'IsToaMo'), '') = 'true' THEN 'TMO' ELSE '' END;

    madt_nt TEXT; -- mã đối tượng, lấy cho đủ số liệu, toa thuốc mới lên module
    madv_nt TEXT; -- mã khoa, lấy cho đủ số liệu, toa thuốc mới lên module
    maicd_nt TEXT; --maicd, lấy cho đủ số liệu, toa thuốc mới lên module
    kqcdoan_nt TEXT;--kqcdoan, lấy cho đủ số liệu, toa thuốc mới lên module
    maicdp_nt TEXT; --maicdp , lấy cho đủ số liệu, toa thuốc mới lên module
    kqcdoanp_nt TEXT;--kqcdoanp , lấy cho đủ số liệu, toa thuốc mới lên module

    mayhct_nt TEXT; --mayhct
    tenyhct_nt TEXT;--tenyhct
    pcchandoan TEXT := ';';
    chandoan_ct TEXT;
    cdoan TEXT := '';
    cdoanp TEXT := '';

    thangnam TEXT;
    thangkt_S TEXT; -- thangkt, lấy cho đủ số liệu, toa thuốc mới lên module
    namkt_S TEXT; --namkt, lấy cho đủ số liệu, toa thuốc mới lên module

    ngayhd DATE;
    ngaylap DATE;
    giolap TIMESTAMP;
	giolap_hd TIMESTAMP;
    toaxv NUMERIC := 0;


    pres JSONB;
    pres_item JSONB;
    idx INT;
    soluong NUMERIC;
    ngay_uong INT:= 0;
    sang NUMERIC := 0;
    trua NUMERIC := 0;
    chieu NUMERIC := 0;
    toi NUMERIC := 0;
    lieu_dung TEXT;
    cachuong TEXT;
    inv_code TEXT; --sohd
    khoCode TEXT; --khole
    khochan_ct TEXT; --khochan
    so_con_lai NUMERIC;
    tong_thanhtien NUMERIC := 0;
    tong_thanhtienbhyt NUMERIC := 0;
    tong_thanhtienvat NUMERIC := 0;
    loaitoa_ct NUMERIC := 0;
    noitru_nt NUMERIC := 1; --noitru, lấy cho đủ số liệu, toa thuốc mới lên module
    loaixn_nt TEXT := 'xbb'; --loaixn, lấy cho đủ số liệu, toa thuốc mới lên module

    taikhoan_nt TEXT;--taikhoan: lập phiếu
    manv_nt TEXT;--manv: lập phiếu
    mathe_nt TEXT;--manv: lập phiếu

    db_ngaygio TIMESTAMP;
    r_stock RECORD;
    stt_nt INT;
    pres_success BOOLEAN := TRUE;
    ct_thanhtoan TEXT := ''; --'': Toa BH, '1': Toa thu phí
    ishi BOOLEAN := TRUE; -->> TRUE: Toa BHYT, FALSE: Toa thu phí

    toncuoi_ps NUMERIC:= 0;
    Matutruc TEXT:= ''; --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
    dain NUMERIC:= 0;

    -- Biến kiểm tra ICD
    missing_icds TEXT[];
    r_bnnoitru RECORD;
    r_ttcon RECORD;
    so_ngay NUMERIC := 0;
    ma_con TEXT;
    toa_con NUMERIC := 0;
	r_canhbao RECORD;
	r_ketqua RECORD;
	text_canhbao TEXT := '';
    text_dieukien  TEXT := '';
    text_sql  TEXT := '';
BEGIN

    --[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = PatientCode AND maba = MedicalRecordNo AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message',
            format('Mabn: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)',
            PatientCode, MedicalRecordNo)
        );
    END IF;

   -- Kiểm tra IDDienBien
    IF NOT EXISTS (SELECT 1 FROM current.qtdieutri WHERE iddienbien = TPCode) THEN
      INSERT INTO badt_dhs.insert_log(tpc_code, patient_code, admission_code,
                                      error_message, error_detail, raw_json)
      VALUES (TPCode, PatientCode, AdmissionCode,
              'Không tìm thấy IDdienbien', format('TPCode %s không tồn tại trong qtdieutri', TPCode), input_json);
      		  pres_success := FALSE;
              RETURN jsonb_build_object(
                  'status', 'error',
                  'message', format('IDdienbien %s không tồn tại', TPCode)
              );
      --RETURN FALSE;
   END IF;

  --[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra tồn tại mahh
  IF input_json ? 'Prescriptions' AND jsonb_array_length(input_json->'Prescriptions') > 0 THEN

      WITH dx AS (
          SELECT DISTINCT
                 (d->>'InventoryCode')::text AS mahh_code
          FROM jsonb_array_elements(input_json->'Prescriptions') AS d
          WHERE NULLIF(d->>'InventoryCode','') IS NOT NULL
      ),
      missing AS (
          SELECT dx.mahh_code
          FROM dx
          LEFT JOIN current.dmthuoc m
                 ON m.mahh = dx.mahh_code AND COALESCE(m.xoa,0)=0
          WHERE m.mahh IS NULL
      )
      SELECT ARRAY_AGG(mahh_code)
      INTO missing_icds
      FROM missing;

      IF missing_icds IS NOT NULL THEN
          RETURN jsonb_build_object('status', 'error', 'message',
              format('InventoryCode code không tồn tại hoặc ngưng sử dụng trong current.dmthuoc: %L', missing_icds));
      END IF;

      --[ÔNG TRIỆU HẬU: 2025-09-18]
      -- Kiểm tra thêm StoreHouse SELECT khocp INTO khocp_dt FROM current.dmkhocp WHERE loai = 2 AND dongy = 1 LIMIT 1;
      --                    và SELECT khocp INTO khocp_dt FROM current.dmdoituongkhocp WHERE madt= madt_nt and (noitru = 1 or noitru = 2) ORDER BY noitru LIMIT 1
      -- Kiểm tra thêm Matutru
      -- SELECT array_agg(madv)::TEXT[] INTO kho_tutruc
	  -- FROM current.dmdonvi
      -- WHERE loaidv = 3 AND COALESCE(vietngan, '') = madv_nt;
      --


  END IF;

    -- lấy pcchandoan
    SELECT giatri INTO pcchandoan from current.system where tents = 'pcchandoan';
    --[ntvuong: 2025-10-03] Kiểm tra thông tin thẻ 2
    --Lấy thông tin thẻ bh2
    SELECT *,
       CASE WHEN length(mathe) > 10 THEN substring(mathe from 3 for 1) ELSE NULL END AS maql
    INTO r_ttcon
    FROM current.ttcon
    WHERE mabnme = PatientCode
        AND mabame = MedicalRecordNo
        AND COALESCE(loaitt,0) = 1;
    --
    SELECT *,
       CASE WHEN length(mathe) > 10 THEN substring(mathe from 3 for 1) ELSE NULL END AS maql
    INTO r_bnnoitru
    FROM current.bnnoitru
    WHERE mabn = PatientCode
    	AND maba = MedicalRecordNo
        AND makb = AdmissionCode;
        
    madv_nt = r_bnnoitru.madv;
    
    IF COALESCE(r_ttcon.maba,'') <> '' THEN
    	madt_nt = r_ttcon.madt;
        maicd_nt = r_ttcon.maicd;
        kqcdoan_nt = r_ttcon.kqcdoan;
        maicdp_nt = r_ttcon.maicdp;
        kqcdoanp_nt = r_ttcon.kqcdoanp;
        mathe_nt = r_ttcon.mathe;
        mayhct_nt = r_ttcon.mayhct;
        tenyhct_nt = r_ttcon.tenyhct;
        ma_con = r_ttcon.maba;
        toa_con = 2;
    ELSE
    	madt_nt = r_bnnoitru.madt;
        madv_nt = r_bnnoitru.madv;
        maicd_nt = r_bnnoitru.maicd;
        kqcdoan_nt = r_bnnoitru.kqcdoan;
        maicdp_nt = r_bnnoitru.maicdp;
        kqcdoanp_nt = r_bnnoitru.kqcdoanp;
        mathe_nt = r_bnnoitru.mathe;
        mayhct_nt = r_bnnoitru.mayhct;
        tenyhct_nt = r_bnnoitru.tenyhct;
        ma_con = '';
        toa_con = 0;
    END IF;

    -- Lấy madt
    /*
    SELECT madt, madv, maicd, kqcdoan, maicdp, kqcdoanp, mathe, mayhct, tenyhct
    INTO madt_nt, madv_nt, maicd_nt, kqcdoan_nt, maicdp_nt, kqcdoanp_nt, mathe_nt, mayhct_nt, tenyhct_nt -- lấy cho đủ số liệu
    FROM current.bnnoitru
    WHERE mabn = PatientCode AND maba = MedicalRecordNo AND makb = AdmissionCode;
    */
    -- Lấy ngày giờ diễn biến
    /*
    SELECT ngaygio INTO db_ngaygio
    FROM current.qtdieutri
    WHERE iddienbien = TPCode;
    */
    ngayhd := CASE WHEN voucherdate_text = '' THEN ngay::DATE ELSE voucherdate_text::DATE END; --Vuong chỉnh 05/08/2025
    toaxv := CASE WHEN isdischarge::BOOLEAN = FALSE THEN 0 ELSE 1 END; --Toa xuất viện
    ngaylap := ngay::DATE;
    giolap := CASE WHEN voucherdate_text = '' THEN ngay::TIMESTAMP ELSE voucherdate_text::TIMESTAMP END; --Vuong chỉnh 06/08/2025
	giolap_hd := giolap;
    -- Lấy ngày uống: Fix ngày uống toa xuất viện
    ngay_uong := CASE WHEN COALESCE(input_json->>'DateOfUse', '') = '' THEN '0' ELSE input_json->>'DateOfUse' END::INT;
    --Lấy tài khoản bs
    SELECT taikhoan, manv INTO taikhoan_nt, manv_nt
    FROM current.dmnhanvien
    WHERE manv = EmployeeCode OR manv = TreatmentDoctorCode;

    IF COALESCE(taikhoan_nt,'') = '' THEN
    	pres_success := FALSE;
        RAISE EXCEPTION 'Không tìm Thông tin nhân viên thực hiện (EmployeeCode: %, TreatmentDoctorCode: %)', EmployeeCode, TreatmentDoctorCode;
        RETURN jsonb_build_object(
                  'status', 'error',
                  'message', format('Không tìm Thông tin nhân viên thực hiện (EmployeeCode: %L, TreatmentDoctorCode: %L)', EmployeeCode, TreatmentDoctorCode)
              );
    END IF;

    IF madt_nt IS NULL THEN
    	pres_success := FALSE;
        RAISE EXCEPTION 'Không tìm thấy mã điều trị';
        RETURN jsonb_build_object(
                  'status', 'error',
                  'message', format('Không tìm thấy bệnh nhân %s', PatientCode)
              );
    END IF;

    -- Lấy tháng/năm kế toán
    SELECT giatri INTO thangnam FROM current.system WHERE tents = 'thanglv';
    thangkt_S := SPLIT_PART(thangnam, '/', 1);
    namkt_S := SPLIT_PART(thangnam, '/', 2);

   --[Vương-01-10-2025]
    --Kiểm tra ngày có thuộc tháng kế toán hay không
    --VoucherDate
    IF NOT EXISTS (
        SELECT 1 FROM current.thangkt
        WHERE thangkt = thangkt_S
             AND namkt = namkt_S
             AND ngayhd::DATE BETWEEN ngaybd::DATE AND ngaykt::DATE
    ) THEN
        RETURN json_build_object(
            'status', 'error',
            'message', format('VoucherDate/Ngay: %s không thuộc tháng kế toán %s/%s.',ngayhd,thangkt_S,namkt_S)
            );
    END IF;

    --Ngaylap
    IF NOT EXISTS (
        SELECT 1 FROM current.thangkt
        WHERE thangkt = thangkt_S
             AND namkt = namkt_S
             AND ngaylap::DATE BETWEEN ngaybd::DATE AND ngaykt::DATE
    ) THEN
        RETURN json_build_object(
            'status', 'error',
            'message', format('Ngay: %s không thuộc tháng kế toán %s/%s.',ngaylap,thangkt_S,namkt_S)
            );
    END IF;

    --Kiểm tra toa đã tổng hợp, đã thu chưa
    IF EXISTS ( SELECT 1 FROM current.chungtu ct WHERE mabn = PatientCode AND makh = MedicalRecordNo  AND iddienbien = TPCode AND sohd = PresCode AND COALESCE(ct.xoa,0) = 0 AND (COALESCE(ct.dain,0) = 1 OR COALESCE(ct.dathu,0) = 1)) THEN
        RETURN json_build_object(
            'status', 'error',
            'message', format('Chứng từ %s đã tồn tại và đã phát thuốc hoặc thu tiền.',PresCode)
        );
    END IF;
    -- Kiểm tra trùng chứng từ
    IF EXISTS (SELECT 1 FROM current.chungtu WHERE sohd = PresCode AND mabn = PatientCode AND makh = MedicalRecordNo AND iddienbien = TPCode) THEN
      -- Gọi hàm xóa toa
      PERFORM badt_dhs.deletetpprescription(input_json);
    END IF;

    -- Duyệt qua từng thuốc trong đơn
    pres := input_json->'Prescriptions';
    RAISE NOTICE 'Ngày uống 1: %',
                  ngay_uong;
    -- Kiểm tra tất cả thuốc trong toa còn đủ xuất thì mới tiến hành xuất thuốc
    FOR idx IN 0 .. jsonb_array_length(pres) - 1 LOOP
      pres_item := pres->idx;
      inv_code := COALESCE(pres_item->>'InventoryCode','');
      khoCode := COALESCE(pres_item->>'StoreHouse','');
      Matutruc := COALESCE(pres_item->>'Matutruc','');

      IF khoCode<>'' AND Matutruc<>'' THEN
        pres_success := FALSE;
        -- Cách 4: Sử dụng %L thay cho %s (để xử lý NULL an toàn hơn)
        RETURN jsonb_build_object(
            'status', 'error',
            'message', format('StoreHouse=%L và Matutruc=%L Không thể đồng thời khác rỗng.', khoCode, Matutruc)
        );
      END IF;

      RAISE NOTICE 'khoCode: %, Matutruc:%', khoCode, Matutruc;
      IF khoCode='' AND Matutruc<>'' THEN
        SELECT khocp INTO khoCode FROM current.dmdonvi WHERE COALESCE(madv,'')=Matutruc AND COALESCE(loaidv,0)=3;
        dain=1;
      END IF;

      --   soluong := COALESCE((pres_item->>'OriDispenseQty')::NUMERIC, 0);
      -- [ÔNG TRIỆU HẬU - 2025-08-13] Chỉnh lại lấy cột số lượng đúng theo qui ước EMR ![](https://live.staticflickr.com/65535/54716976562_f6fef58c7f_b.jpg)
      soluong := COALESCE((pres_item->>'DispenseQty')::NUMERIC, 0);
      toncuoi_ps := 0;
      --Lây khochan
      SELECT khocpc INTO khochan_ct FROM current.dmkhocp WHERE khocp = khoCode;

      RAISE NOTICE 'khoCode: %, Matutruc:%, khochan_ct: %', khoCode, Matutruc, khochan_ct;

      SELECT SUM(COALESCE(tk.toncuoi,0) - COALESCE(tk.tamxuat,0)) as ps_toncuoi INTO toncuoi_ps
      FROM current.pstonkho tk
      WHERE tk.mahh = inv_code
          AND CASE WHEN Matutruc<>'' THEN tk.madv = Matutruc  ELSE tk.khocp = khoCode END --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
          AND tk.thangkt = thangkt_S
          AND tk.namkt = namkt_S
          AND COALESCE(tk.xoa, 0) = 0 ;

      IF toncuoi_ps < soluong THEN
         pres_success := FALSE;
         INSERT INTO badt_dhs.insert_log(tpc_code, patient_code, admission_code,
                                          error_message, error_detail, raw_json)
          VALUES(TPCode, PatientCode, AdmissionCode,
                 format('Số lượng thuốc %s: tồn kho %s không đủ xuất', inv_code, toncuoi_ps), '', input_json);
          RETURN jsonb_build_object(
                'status', 'error',
                'message', format('Số lượng thuốc %s: tồn kho %s không đủ xuất', inv_code,toncuoi_ps));
      END IF;
   END LOOP;

   /*
   	[2025-11-18]: Fix lỗi isHI = true --> ghi nhận mã đối tượng là TP
   */
    IF IsHI_CT THEN --Vương chỉnh 10-11-2025: Fix lỗi vừa check Toa thu phí và vừa check TMO
       ct_thanhtoan := '';
       loaitoa_ct = 1; --BH;
    ELSE
      ct_thanhtoan := '1';
      madt_nt      := '06';
      loaitoa_ct = 0; --TP;
    END IF;
    /*
   	[NTV 2026-02-06]: Cảnh báo trùng thời gian toa thuốc của nhiều BN
   */
    SELECT
    split_part(x, ':', 2)::int AS canhbao,
    split_part(y, ':', 2)::int AS sophut,
    split_part(z, ':', 2)::int AS loaitoa
	INTO r_canhbao
	FROM (
		SELECT
			split_part(giatri, '|', 1) AS x,
			split_part(giatri, '|', 2) AS y,
			split_part(giatri, '|', 3) AS z
		FROM (SELECT giatri FROM current.system WHERE tents  = 'toathuoc.thoigianratoa') t
	) t2 ;
    IF r_canhbao.canhbao > 0 THEN 			  
		
    	IF r_canhbao.loaitoa = 0 THEN
            text_dieukien := '';
        END IF;

        IF r_canhbao.loaitoa = 1 AND IsHI_CT THEN
            text_dieukien := ' AND COALESCE(ct.thanhtoan, '''') = '''' ';
        END IF;

        IF r_canhbao.loaitoa = 2 AND IsHI_CT = false THEN
            text_dieukien := ' AND COALESCE(ct.thanhtoan, '''') = ''1'' ';
        END IF;
		
        SELECT
            string_agg(
                '- Số hóa đơn: ' || ct.sohd
                || ', ngày giờ lập: ' || to_char(ct.giolap, 'DD/MM/YYYY HH24:MI')
                || ', cách: ' || abs(
                    ROUND(
                        EXTRACT(EPOCH FROM (ct.giolap - giolap_hd::timestamp)) / 60
                    )::int
                ) || ' phút',
                E'\n'
                ORDER BY ct.giolap
            ) AS ketqua
        INTO r_ketqua
        FROM current.chungtu ct
        WHERE ct.manv = EmployeeCode
          AND ct.loaixn = 'xbb'
          AND COALESCE(ct.xoa, 0) = 0
          AND ct.thangkt = thangkt_S
          AND ct.namkt = namkt_S
          AND ct.sohd != PresCode || text_dieukien 
          AND EXTRACT(EPOCH FROM (ct.giolap - giolap_hd::timestamp)) / 60 BETWEEN -r_canhbao.sophut AND r_canhbao.sophut;
          
          IF r_canhbao.canhbao > 0 AND r_ketqua.ketqua <> '' THEN 
			IF r_canhbao.canhbao = 1 THEN
				text_canhbao = r_ketqua.ketqua;
			ELSE
			RETURN jsonb_build_object(
						'status', 'error',
						'message', format(r_ketqua.ketqua)
					);
			END IF;
		END IF;
	END IF;
	
    IF pres_success THEN
      FOR idx IN 0 .. jsonb_array_length(pres) - 1 LOOP
        pres_item := pres->idx;
        ishi := COALESCE((pres_item->>'IsHI')::boolean, true); --True: Toa BH, False: Toa thu phí
        inv_code := pres_item->>'InventoryCode';
        khoCode := COALESCE(pres_item->>'StoreHouse','');
        Matutruc := COALESCE(pres_item->>'Matutruc','');

        RAISE NOTICE 'khoCode: %, Matutruc:%', khoCode, Matutruc;
        IF khoCode='' AND Matutruc<>'' THEN
            SELECT khocp INTO khoCode FROM current.dmdonvi WHERE COALESCE(madv,'')=Matutruc AND COALESCE(loaidv,0)=3;
            SELECT khocpc INTO khochan_ct FROM current.dmkhocp WHERE khocp = khoCode;
            dain=1;
        END IF;

          soluong := COALESCE((pres_item->>'DispenseQty')::NUMERIC, 0); -- Đổi từ OriDispenseQty --> DispenseQty
          so_con_lai := soluong;
          stt_nt := COALESCE((pres_item->>'OrderNo')::INT, idx + 1);

          sang := COALESCE((pres_item->>'MorningQty')::NUMERIC, 0);
          trua := COALESCE((pres_item->>'MiddayQty')::NUMERIC, 0);
          chieu := COALESCE((pres_item->>'AfternoonQty')::NUMERIC, 0);
          toi := COALESCE((pres_item->>'EveningQty')::NUMERIC, 0);

          lieu_dung := pres_item->>'Sudung';
          cachuong := pres_item->>'Cachuong';

          -- Lặp qua các lô tồn kho còn hạn dùng
          FOR r_stock IN
              SELECT    tk.mahh, tk.handung, tk.solo, tk.visa, COALESCE(tk.toncuoi,0) - COALESCE(tk.tamxuat,0) as toncuoi,
              --[ÔNG TRIỆU HẬU - 2025-08-16]: Chỉnh lại lấy giá xuất trong pstonkho để không lỗi tính toán tồn kho (có trong pshdxn mà không có trong pstonkho)
              -- đang bị vướng ở Hồng Dân - Bạc Liêu ![](https://live.staticflickr.com/65535/54724059876_4da9e010a5_b.jpg)
                        tk.giavat, tk.giaxuat, tk.giabhyt, k.bhyt, tk.khocp, tk.madv --[Nguyễn Triều Vương 2025-12-10]: lấy cột giabhyt từ pstonkho để khớp với cách lấy của HIS
              FROM current.pstonkho tk
              JOIN current.dmkho k ON tk.mahh = k.mahh
              WHERE tk.mahh = inv_code
                AND CASE WHEN Matutruc<>'' THEN tk.madv = Matutruc ELSE tk.khocp = khoCode END --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
                AND tk.thangkt = thangkt_S
                AND tk.namkt = namkt_S
                AND COALESCE(tk.xoa, 0) = 0
		        AND COALESCE(tk.uutien, '') != '2' --2: Cấm xuất
                AND COALESCE(tk.toncuoi,0) > 0
                AND COALESCE(tk.toncuoi,0) - COALESCE(tk.tamxuat,0) > 0
              ORDER BY tk.uutien ASC, tk.handung DESC

          LOOP
              -- In dữ liệu từng dòng để kiểm tra
              RAISE NOTICE 'Lô: %, Hạn dùng: %, SL tồn: %, Giá xuất: %, khocp: %, madv: %',
                  r_stock.solo, r_stock.handung, r_stock.toncuoi, r_stock.giaxuat, r_stock.khocp, r_stock.madv;
              -- IN số lượng còn lại
              RAISE NOTICE 'SL: %',
                  soluong;

              DECLARE
                sl_lay NUMERIC := LEAST(so_con_lai, r_stock.toncuoi);
              --sl_lay NUMERIC := soluong;
                  --sl_lay NUMERIC := LEAST(so_con_lai, r_stock.toncuoi);

              BEGIN
                  -- Ghi chi tiết vào pshdxh (mỗi lô 1 dòng)
                  RAISE NOTICE '--SỐ Lượng lấy: %',sl_lay;
                  IF pres_success AND sl_lay > 0 THEN
                      INSERT INTO current.pshdxn(
                          sohd, iddienbien, mabn, makh,
                          mahh, ngayhd, ngaylap, giolap, madv,
                          soluong, sang, trua, chieu, toi, lieu_dung, cachuong,
                          giaban, giavat,giabhyt, thanhtien, thanhtienbhyt, bhyt,
                          handung, solo, visa, thangkt, namkt,
                          stt, loaixn,noitru,khole, toaxv,
                          madt, khochan,theodon,tienvat,tenmay,loaitoa,thanhtoan,
                          dain,toatutruc,tutruc,macon, toacon, kyhieu
                      ) --them 06/08/2025
                      VALUES (
                          PresCode, tpcode, PatientCode, MedicalRecordNo,
                          inv_code, ngayhd, ngaylap, giolap, madv_nt,
                          sl_lay, sang, trua, chieu, toi, lieu_dung, cachuong,
                          r_stock.giaxuat, r_stock.giavat, r_stock.giabhyt, r_stock.giaxuat * sl_lay, r_stock.giabhyt * sl_lay, r_stock.bhyt,
                          r_stock.handung, r_stock.solo, r_stock.visa, thangkt_S, namkt_S,
                          stt_nt,loaixn_nt,noitru_nt,khoCode, toaxv,
                          madt_nt,khochan_ct,sl_lay,r_stock.giavat * sl_lay,'',loaitoa_ct, ct_thanhtoan, --thêm 06/08/2025
                          dain, CASE WHEN dain=0 THEN 0 ELSE 1 END, Matutruc,ma_con,toa_con, strtoamo  --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
                      );

                      -- Cập nhật tồn kho
                      RAISE NOTICE 'Tồn kho mahh: %, khocp: %, Giá vat: %, HD: %, số lô:%, sl_lay: %',
                          inv_code, khoCode, r_stock.giavat, r_stock.handung, r_stock.solo, sl_lay;

                      UPDATE current.pstonkho
                      SET
                        --[ÔNG TRIỆU HẬU - 2025-09-09]: Chỉnh lỗi cập nhật giá trị bị sai, đối với kho, khi đưa vào xử lý chung với tủ trực pstonkho_check_toncuoi_dh_chk3
                        tamxuat = COALESCE(tamxuat, 0) + (CASE WHEN Matutruc<>'' THEN 0 ELSE COALESCE(sl_lay,0) END) ,
                        toncuoi = COALESCE(toncuoi, 0) - (CASE WHEN Matutruc<>'' THEN COALESCE(sl_lay,0) ELSE 0 END),
                        xuat = COALESCE(xuat, 0) + (CASE WHEN Matutruc<>'' THEN COALESCE(sl_lay,0) ELSE 0 END)
                      WHERE COALESCE(mahh,'') = COALESCE(inv_code,'')
                        AND COALESCE(giavat,0) = COALESCE(r_stock.giavat,0)
                        AND CASE WHEN Matutruc<>'' THEN madv = Matutruc ELSE COALESCE(khocp,'') = COALESCE(khoCode,'') END
                        AND COALESCE(handung,'') = COALESCE(r_stock.handung,'')
                        AND COALESCE(solo,'') = COALESCE(r_stock.solo,'')
			                  AND COALESCE(thangkt,'') = COALESCE(thangkt_S,'')
                        AND COALESCE(namkt,'') = COALESCE(namkt_S,'');

                      -- Cộng vào tổng
                      RAISE NOTICE '--Tính tổng';
                        --[ÔNG TRIỆU HẬU - 2025-08-16]: Chỉnh lại tính thành tiền theo sl_lay
                        --   tong_thanhtien := tong_thanhtien + (r_stock.giaxuat * soluong);
                        --   tong_thanhtienbhyt := tong_thanhtienbhyt + (r_stock.giabhyt * soluong);
                        --   tong_thanhtienvat := tong_thanhtienvat + (r_stock.giavat * soluong);
                        tong_thanhtien     := tong_thanhtien     + (r_stock.giaxuat * sl_lay);
                        tong_thanhtienbhyt := tong_thanhtienbhyt + (r_stock.giabhyt * sl_lay);
                        tong_thanhtienvat  := tong_thanhtienvat  + (r_stock.giavat  * sl_lay);

                      -- In dữ liệu từng dòng để kiểm tra
                      RAISE NOTICE 'Tổng thành tiền: %, Giá xuất: %, SL: %, SL còn lại: %',
                          tong_thanhtien, r_stock.giaxuat, soluong, so_con_lai;
                      -- Trừ số còn lại
                      so_con_lai := so_con_lai - sl_lay;
                      RAISE NOTICE '--Cập nhật thành công';
                  END IF;
              END;
          END LOOP;

          -- Nếu vẫn còn thiếu thuốc, ghi log lỗi
          IF so_con_lai > 0 THEN
              pres_success := FALSE;
              INSERT INTO badt_dhs.insert_log(tpc_code, patient_code, admission_code,
                                              error_message, error_detail, raw_json)
              VALUES(TPCode, PatientCode, AdmissionCode,
                     format('Không đủ thuốc %s: thiếu %s đơn vị', inv_code, so_con_lai), '', input_json);
              --RETURN FALSE;
              RETURN jsonb_build_object(
                    'status', 'error',
                    'message', format('Không đủ thuốc %s: thiếu %s đơn vị', inv_code,so_con_lai)
                );
          END IF;
      END LOOP;
    END IF;

    -- Chèn 1 dòng tổng vào CHUNGTU
	BEGIN
    	IF pres_success THEN
          --Lấy chẩn đoán chứng từ
          IF tenyhct_nt != '' THEN
                cdoan := tenyhct_nt || ' [' || kqcdoan_nt || ']';
                cdoanp := CASE WHEN kqcdoanp_nt = '' THEN '' ELSE pcchandoan || kqcdoanp_nt END;
                chandoan_ct := cdoan || cdoanp;
          ELSE
            cdoan := kqcdoan_nt;
            cdoanp := CASE WHEN kqcdoanp_nt = '' THEN '' ELSE pcchandoan || kqcdoanp_nt END;
            chandoan_ct := cdoan || cdoanp;
          END IF;
          RAISE NOTICE 'Chứng từ ngày uống: %',
                          ngay_uong;
          INSERT INTO current.chungtu(
            sohd, iddienbien, mabn, makh, madt, madv,
            manv, ngayuong, ghichu, khole,
            ngayhd, ngaylap, giolap, thanhtien, thangkt, namkt,
            loaixn,noitru, taikhoan, maicd, kqcdoan, maicdp, kqcdoanp, api, thanhtoan, toaxv,
            khochan,tienvat,tenmay,taikham,loaitoa,mathe,thanhtienbhyt,mayhct, tenyhct,
            dain,toatutruc,tutruc,macon, toacon, kyhieu
        ) --them 06/08/2025
          VALUES (
              PresCode, tpcode, PatientCode, MedicalRecordNo, madt_nt, madv_nt,
              manv_nt, ngay_uong, '', khoCode,
              ngayhd, ngaylap, giolap, tong_thanhtien, thangkt_S, namkt_S,
              loaixn_nt,noitru_nt,taikhoan_nt,maicd_nt,chandoan_ct,maicdp_nt,kqcdoanp_nt,1, ct_thanhtoan, toaxv,
              khochan_ct,tong_thanhtienvat,'',0,loaitoa_ct,mathe_nt,tong_thanhtienbhyt,mayhct_nt,tenyhct_nt, --them 06/08/2025
              dain, CASE WHEN dain=0 THEN 0 ELSE 1 END, Matutruc,ma_con,toa_con, strtoamo --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
          );

          RETURN jsonb_build_object(
              'status', 'success',
              'message', format('Thêm thành công chứng từ %s, %s',PresCode,text_canhbao)
          );
        END IF;
END;
--[ÔNG TRIỆU HẬU - 2025-08-16]: Dời ra ngoài để hứng toàn bộ Exception đồng thời ghi nhận log
EXCEPTION
    --[ÔNG TRIỆU HẬU - 2025-08-16]: Gom xử lý lại lỗi, và ghi nhận log để theo dõi.
    WHEN OTHERS THEN
        RAISE NOTICE 'EXCEPTION.OTHERS';
        INSERT INTO badt_dhs.insert_log(tpc_code, patient_code, admission_code,
                                        error_message, error_detail, raw_json)
        VALUES(TPCode, PatientCode, AdmissionCode,
            format('EXCEPTION: %s', SQLERRM), '', input_json);
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
    END;
$$ LANGUAGE plpgsql;
