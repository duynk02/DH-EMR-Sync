
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-06-11
-- Hàm: badt_dhs.InsertCUTPParaClinRequest(p_json JSONB)
-- Mô tả: nhận json DHS insert vào chidinhcls
-- ===============================================================

--Các trường đang bỏ trống :
--taikhoan (chưa có field từ json truyền vào)
--tenmay (chưa có field từ jsontruyền vào)
--toacon (chưa có field từ jsontruyền vào)
--macon (chưa có field từ jsontruyền vào)

-- ===============================================================


CREATE OR REPLACE FUNCTION badt_dhs.InsertCUTPParaClinRequest(p_json JSONB)
RETURNS JSONB AS
$$
DECLARE
    v_tpcode TEXT := TRIM(p_json->>'TPCode');
    v_admissioncode TEXT := TRIM(p_json->>'AdmissionCode');
    v_medicalrecordno TEXT := TRIM(p_json->>'MedicalRecordNo');
    v_paraclinreqcode TEXT := TRIM(p_json->>'ParaClinReqCode');
    v_patientcode TEXT := TRIM(p_json->>'PatientCode');
    v_employeecode TEXT := TRIM(p_json->>'EmployeeCode');

    r_bnnoitru RECORD;
    r_qtdieutri RECORD;
    sys_laygiadan TEXT;
    sys_laygiadv TEXT;

    -- Biến kiểm tra ICD 
    missing_icds TEXT[];
    Para JSONB;
    Para_item JSONB;
    From_Date date;

    -- Biến lưu cls vi phạm điều kiện thời gian chỉ định
    v_vi_pham_thang TEXT[];
    v_vi_pham RECORD;
    v_cmnd TEXT;
    v_mabn_list TEXT[];
    v_filter_mathe TEXT;
    v_thang_check NUMERIC;
    v_nam_check NUMERIC;
    v_max_songay NUMERIC;
    i INT;
BEGIN

    --[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = v_patientcode AND makb = v_admissioncode AND maba = v_medicalrecordno AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            v_patientcode, v_admissioncode, v_medicalrecordno)
        );
    END IF;

    --Lấy thông tin bệnh nhân
    SELECT nt.madt, nt.madv, nt.mathe, dt.bhyt, nt.tinhtrangvv, 
    		COALESCE(bn.gioitinh,0)::NUMERIC AS gioitinh, 
            COALESCE(t2.maba,'') AS ttcon, COALESCE(t2.mathe) AS mathe2, nt.thangkt, nt.namkt,
            --[ÔNG TRIỆU HẬU: 2025-10-24]: Bổ sung ngayvv để kiểm tra ở các bước sau. https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/66
            nt.ngayvv
    INTO r_bnnoitru
    FROM current.bnnoitru nt
    LEFT JOIN current.dmdoituong dt ON dt.madt = nt.madt
    LEFT JOIN current.dmbenhnhan bn ON bn.mabn = nt.mabn
    LEFT JOIN current.ttcon t2 ON t2.mabnme = nt.mabn AND t2.makbme = nt.makb AND t2.mabame = nt.maba AND t2.maba LIKE '%.BH2'
    WHERE nt.ravien = 0
      AND TRIM(nt.mabn) = v_patientcode
      AND TRIM(nt.makb) = v_admissioncode
      AND TRIM(nt.maba) = v_medicalrecordno;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Không tìm thấy thông tin bệnh nhân');
    END IF;

    --[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra tồn tại macls
    IF p_json ? 'ParaClinRequests' AND jsonb_array_length(p_json->'ParaClinRequests') > 0 THEN
        
        WITH dx AS (
            SELECT DISTINCT
                   (d->>'MedSerCode')::text AS macls_code
            FROM jsonb_array_elements(p_json->'ParaClinRequests') AS d
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
    
    

    --Lấy thông tin điều trị
    SELECT qt.iddienbien, qt.madv, qt.maphong, qt.maicd, qt.kqcdoan, qt.maicdp, qt.kqcdoanp,
           qt.mayhct, qt.tenyhct, qt.thangkt, qt.namkt, qt.sogiuong, qt.ngaygio, qt.manv, nv.taikhoan
    INTO r_qtdieutri
    FROM current.qtdieutri qt
    LEFT JOIN current.dmnhanvien nv ON nv.manv = qt.manv
    WHERE qt.iddienbien = v_tpcode;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Không tìm thấy thông tin điều trị');
    END IF;

    --[ntvuong: 2025-10-01] Kiểm tra ngày thuộc tháng kế toán
    Para := p_json->'ParaClinRequests';
    FOR idx IN 0 .. jsonb_array_length(Para) - 1 LOOP
          Para_item := Para->idx;
          From_Date := (Para_item->>'FromDate')::timestamp::date;
		  
          IF NOT EXISTS (
            SELECT 1 FROM current.thangkt
            WHERE thangkt = r_qtdieutri.thangkt
                 AND namkt = r_qtdieutri.namkt
                 AND From_Date::DATE BETWEEN ngaybd::DATE AND ngaykt::DATE
          ) THEN
              RETURN json_build_object(
                  'status', 'error',
                  'message', format('FromDate: %s không thuộc tháng kế toán %s/%s.',From_Date,r_qtdieutri.thangkt,r_qtdieutri.namkt)
                  );
          END IF;
    END LOOP;

	---------------------------------------------------------------------
    -- [NQHOA: 2025-10-16] kiểm tra cls có ngày chỉ định nhỏ hơn ngày vào viện
    ---------------------------------------------------------------------
        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)            
            WHERE r_bnnoitru.ngayvv::TIMESTAMP > (j.item->>'FromDate')::TIMESTAMP
        ) THEN
            RETURN jsonb_build_object(
                'status','error',
                'message','CLS có ngày chỉ định nhỏ hơn ngày nhập viện. Không thể thêm.',
                'MedSerCode', COALESCE((
                    SELECT jsonb_agg(DISTINCT (j.item->>'MedSerCode'))
                    FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)                    
                    WHERE r_bnnoitru.ngayvv::TIMESTAMP > (j.item->>'FromDate')::TIMESTAMP
                ), '[]'::jsonb)
            );
        END IF;
    
    ---------------------------------------------------------------------
    -- [NKDUY: 2026-05-07] Kiểm tra ràng buộc số ngày chỉ định cls cho đối tượng BHYT
    ---------------------------------------------------------------------
    -- r_bnnoitru.bhyt đã được select từ dmdoituong ở trên, nên chỉ cần kiểm tra bhyt IN (1,2)
    IF COALESCE(r_bnnoitru.bhyt, 0) IN (1, 2) THEN
        CREATE TEMP TABLE tmp_cls_songay ON COMMIT DROP AS -- Tạo bảng tạm chỉ chứa các CLS có số ngày quy định lớn hơn 0
        SELECT
            dm.macls,
            dm.tencls,
            dm.songay,
            (j.item->>'FromDate')::DATE AS from_date
        FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)
        JOIN current.dmcls dm ON dm.macls = (j.item->>'MedSerCode')
        WHERE COALESCE(dm.songay, 0) > 0
            AND dm.bhyt = 1; -- Chỉ áp dụng kiểm tra số ngày cho cls được bhyt thanh toán

        IF EXISTS (SELECT 1 FROM tmp_cls_songay) THEN -- Nếu có CLS nào có quy định số ngày, mới thực hiện kiểm tra
            -- xác định số tháng tối đa cần tìm ngược
            SELECT MAX(songay) 
            INTO v_max_songay 
            FROM tmp_cls_songay;

            -- Xác định filter tìm kiếm (mathe hoặc cmnd)
            IF COALESCE(r_bnnoitru.mathe, '') != '' THEN
                v_filter_mathe := r_bnnoitru.mathe;
                v_mabn_list := NULL;
            ELSE
                -- Ko có mathe thì gom tất cả các mabn cùng 1 người
                v_filter_mathe := NULL;
                SELECT TRIM(bn.cmnd) -- ràng trước trường hợp cmnd có khoảng trắng
                INTO v_cmnd
                FROM current.dmbenhnhan bn
                WHERE bn.mabn = v_patientcode
                    AND NULLIF(TRIM(bn.cmnd), '') IS NOT NULL;

                IF v_cmnd IS NOT NULL THEN
                    -- log mã cmnd ra xem
                    --RAISE NOTICE 'CMND: %', v_cmnd;
                    SELECT ARRAY_AGG(DISTINCT TRIM(bn.mabn))
                    INTO v_mabn_list
                    FROM current.dmbenhnhan bn
                    WHERE TRIM(bn.cmnd) = v_cmnd;
                    IF v_mabn_list IS NULL THEN
                        v_mabn_list := ARRAY[v_patientcode]; -- Phòng trường hợp lỗi truy vấn dẫn đến không có mabn nào được trả về
                    END IF;
                ELSE -- Nếu không có cmnd thì chỉ kiểm tra theo mabn hiện tại
                    v_mabn_list := ARRAY[v_patientcode];
                END IF;
            END IF;

            v_thang_check := r_bnnoitru.thangkt;
            v_nam_check := r_bnnoitru.namkt;

            CREATE TEMP TABLE tmp_thang_nam ON COMMIT DROP AS
            SELECT ''::TEXT AS thangkt, ''::TEXT AS namkt
            WHERE FALSE; -- Tạo bảng tạm để lưu các tháng/năm cần check

            FOR i IN 0 .. LEAST(CEIL(v_max_songay::FLOAT / 28), 6)
            LOOP
                INSERT INTO tmp_thang_nam (thangkt, namkt)
                VALUES (
                    LPAD(v_thang_check::TEXT, 2, '0'),
                    v_nam_check::TEXT
                );
                IF v_thang_check = 1 THEN
                    v_thang_check := 12;
                    v_nam_check := v_nam_check - 1;
                ELSE
                    v_thang_check := v_thang_check - 1;
                END IF;
            END LOOP;

            CREATE TEMP TABLE tmp_chidinh ON COMMIT DROP AS
            SELECT DISTINCT ON (cd.macls) cd.macls, cd.ngaykcb::DATE AS ngaykcb
            FROM current.chidinhcls cd
            WHERE cd.xoa = 0
                AND cd.ngaykcb IS NOT NULL
                AND (cd.thangkt, cd.namkt) IN (SELECT thangkt, namkt FROM tmp_thang_nam)
                AND cd.macls IN (SELECT macls FROM tmp_cls_songay)
                AND (
                    (v_filter_mathe IS NOT NULL AND cd.mathe = v_filter_mathe)
                    OR
                    (v_filter_mathe IS NULL AND cd.mabn = ANY(v_mabn_list))
                )
            ORDER BY cd.macls, cd.ngaykcb DESC;

            -- Chỉ cần 1 cls vi phạm là dừng ngay
            SELECT t.macls, t.tencls, t.songay, t.from_date, cd.ngaykcb
            INTO v_vi_pham
            FROM tmp_cls_songay t
            JOIN tmp_chidinh cd 
                ON cd.macls = t.macls
            WHERE t.from_date - cd.ngaykcb::DATE < t.songay
            ORDER BY t.macls, cd.ngaykcb DESC
            LIMIT 1;

            IF FOUND THEN
            -- RAISE NOTICE 'CLS %:[%] có ngày chỉ định gần nhất là % vi phạm quy định số ngày chỉ định liên tiếp là % ngày. Không thể thêm mới.', v_vi_pham.macls, v_vi_pham.tencls, v_vi_pham.ngaykcb, v_vi_pham.songay;
                RETURN jsonb_build_object(
                    'status', 'error',
                    'message', format('CLS %s:[%s] có ngày chỉ định gần nhất là %s vi phạm quy định số ngày chỉ định liên tiếp là %s ngày. Không thể thêm mới.',
                        v_vi_pham.macls, v_vi_pham.tencls, v_vi_pham.ngaykcb, v_vi_pham.songay),
                    'MedSerCode', v_vi_pham.macls
                );
            END IF;
        END IF;
    END IF;
    ---------------------------------------------------------------------
    -- [NQHOA: 2025-10-15] kiểm tra cls có cấu hình thực hiện, đã chỉ định trước đó nhưng chưa có kết quả không cho chỉ định mới
    ---------------------------------------------------------------------
        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)
            JOIN current.chidinhcls cd
                 ON cd.macls = (j.item->>'MedSerCode')
                AND cd.mabn = v_patientcode
                AND cd.makb = v_admissioncode
                AND cd.maba = v_medicalrecordno
                AND cd.xoa = 0
                AND cd.namkt||cd.thangkt >= r_bnnoitru.namkt||r_bnnoitru.thangkt
            JOIN current.dmcls dm ON dm.macls = cd.macls
            WHERE COALESCE(dm.thuchien,0) = 1
              --[ÔNG TRIỆU HẬU: 2025-11-19] Kiểm tra thêm COALESCE(cd.dalappttt,0)=0
              AND COALESCE(cd.dath,0) = 0 AND COALESCE(cd.dalappttt,0)=0
              AND cd.ngaykcb <> (j.item->>'FromDate')::TIMESTAMP
        ) THEN
            RETURN jsonb_build_object(
                'status','error',
                'message','Có CLS cấu hình thực hiện đã được chỉ định nhưng chưa thực hiện, không thể thêm mới',
                'MedSerCode', COALESCE((
                    SELECT jsonb_agg(DISTINCT cd.macls)
                    FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)
                    JOIN current.chidinhcls cd 
                         ON cd.macls = (j.item->>'MedSerCode')
                        AND cd.mabn = v_patientcode
                        AND cd.makb = v_admissioncode
                        AND cd.maba = v_medicalrecordno
                        AND cd.xoa = 0
                        AND cd.namkt||cd.thangkt >= r_bnnoitru.namkt||r_bnnoitru.thangkt
                    JOIN current.dmcls dm ON dm.macls = cd.macls
                    WHERE dm.thuchien = 1
                      --[ÔNG TRIỆU HẬU: 2025-11-19] Kiểm tra thêm COALESCE(cd.dalappttt,0)=0
                      AND COALESCE(cd.dath,0) = 0 AND COALESCE(cd.dalappttt,0)=0
                      AND cd.ngaykcb <> (j.item->>'FromDate')::TIMESTAMP
                ), '[]'::jsonb)
            );
        END IF;
    ---------------------------------------------------------------------
    
    SELECT COALESCE(giatri, '0') INTO sys_laygiadan
    FROM current.system WHERE tents = 'laygiadan';
    
    SELECT COALESCE(giatri, '0') INTO sys_laygiadv
    FROM current.system WHERE tents = 'laygiadv';
    
    CREATE TEMP TABLE ClsData ON COMMIT DROP AS
      SELECT *
      FROM current.chidinhcls cls
      WHERE cls.idchidinh = v_paraclinreqcode
        AND cls.xoa = 0
        AND cls.mabn = v_patientcode
        AND cls.makb = v_admissioncode
        AND cls.maba = v_medicalrecordno
        AND cls.thangkt = r_qtdieutri.thangkt
        AND cls.namkt = r_qtdieutri.namkt
        AND (
          cls.dathu != 0 
          OR COALESCE(cls.soctvpcl, '') != ''  
          OR COALESCE(cls.soctvpbltong, '') != ''
          OR cls.dath != 0  
          OR cls.dalappttt != 0
        );
    

    --Group các CLS cha gôm tổng số lượng
    CREATE TEMP TABLE tmp_grouped_requests ON COMMIT DROP AS
    SELECT
        item->>'MedSerCode' AS medser_code,
        SUM(COALESCE((item->>'ParaClinQty')::NUMERIC, 1)) AS para_qty,
        COALESCE((item->>'IsHI')::BOOLEAN::INT, NULL) AS bhyt,
        COALESCE((item->>'Urgent')::INT, NULL) AS tinhtrang,	--Bổ sung cột tình trạng : 0 : Cấp cứu-Khẩn cấp; 1 : bình thường
        COALESCE((item->>'thuphi')::NUMERIC, 0) AS thuphi,
        COALESCE((item->>'IsService')::BOOLEAN::INT, 0) AS dichvu, --[Nguyễn Khắc Duy: 2026-04-01] thay đổi 'dichvu' sang 'IsService' theo thống nhất với EMR
        COALESCE((item->>'miengiam')::NUMERIC, 0) AS miengiam,
        COALESCE((item->>'ptmiengiam')::NUMERIC, 0) AS ptmiengiam_input,
        COALESCE((item->>'thanhtienmiengiam')::NUMERIC, 0) AS thanhtienmg,
		COALESCE((item->>'PCReqDtlNotes')::TEXT, '') AS tenclsphu, --[NTV 2026-01-07: lấy thêm cột tenclsphu (PCReqDtlNotes)]
		--[NQHOA 2025-12-19] Fix lỗi các CLS có giờ phút chỉ định = 00:00:00 khi ghép giờ hiện tại của server có miliseconds gây ra lỗi khi thực hiện báo CLS đã xoá
        date_trunc(
            'second',
            CASE 
                WHEN ((item->>'FromDate')::TIMESTAMP)::TIME = '00:00:00'::TIME
                THEN (item->>'FromDate')::DATE + date_trunc('second', LOCALTIMESTAMP)::TIME
                ELSE (item->>'FromDate')::TIMESTAMP
            END
        ) AS ngaykcb,
        FALSE AS is_child
    FROM jsonb_array_elements(p_json->'ParaClinRequests') AS item
    GROUP BY item->>'MedSerCode', item->>'thuphi', item->>'IsService', item->>'miengiam', item->>'ptmiengiam', 
                item->>'thanhtienmiengiam',item->>'FromDate',item->>'IsHI',item->>'Urgent',item->>'PCReqDtlNotes';

    --Thêm các CLS con, dùng cùng số lượng với CLS cha
    INSERT INTO tmp_grouped_requests (
        medser_code, para_qty, bhyt, tinhtrang, thuphi, dichvu, miengiam, ptmiengiam_input, thanhtienmg, ngaykcb, is_child
    )
    SELECT
        clscon.macls,
        grp.para_qty, COALESCE(grp.bhyt,0) AS bhyt, grp.tinhtrang, CASE WHEN COALESCE(grp.bhyt,0) = 1 THEN 0 ELSE 1 END AS thuphi,
        0, 0, 0, 0, grp.ngaykcb,
        TRUE
    FROM tmp_grouped_requests grp
    JOIN current.dmcls clscon ON clscon.macha = grp.medser_code
    WHERE COALESCE(clscon.sudung,0) = 1 
    	AND (COALESCE(clscon.gioitinh,0) = r_bnnoitru.gioitinh OR COALESCE(clscon.gioitinh,0) = 2)
    	AND clscon.macls NOT IN (
        SELECT medser_code FROM tmp_grouped_requests
    );
    --Kiểm tra CLS đã xoá từ EMR
    IF EXISTS (
        SELECT 1
        FROM ClsData c
        WHERE NOT EXISTS (
            SELECT 1
            FROM tmp_grouped_requests t
            WHERE t.medser_code = c.macls
        )
    ) THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Cận lâm sàng đã thực hiện hoặc đã thu tiền, không thể xoá',
            'MedSerCode',
                COALESCE((
                    SELECT jsonb_agg(c.macls)
                    FROM ClsData c
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM tmp_grouped_requests t
                        WHERE TRIM(t.medser_code) = TRIM(c.macls)
                    )
                ), '[]'::jsonb)
        );
    END IF;
    
    --Kiểm tra CLS thay đổi thông tin
    IF EXISTS (
        SELECT 1
        FROM ClsData c
        JOIN tmp_grouped_requests t ON t.medser_code = c.macls
        WHERE (
            COALESCE(t.para_qty, 0) != COALESCE(c.soluong, 0)
            OR COALESCE(t.bhyt, 0) != COALESCE(c.bhyt, 0)
            OR COALESCE(t.thuphi, 0) != COALESCE(c.thuphi, 0)
            OR COALESCE(t.dichvu, 0) != COALESCE(c.dichvu, 0)
            OR COALESCE(t.miengiam, 0) != COALESCE(c.miengiam, 0)
            OR COALESCE(t.ptmiengiam_input, 0) != COALESCE(c.ptmiengiam, 0)            
        )
        AND (
            c.dathu != 0 OR 
            COALESCE(c.soctvpcl, '') != '' OR 
            c.dath != 0 OR 
            c.dalappttt != 0
        )
    ) THEN
        RETURN jsonb_build_object(
        'status', 'error',
        'message', 'Cận lâm sàng đã thực hiện hoặc đã thu tiền, không thể cập nhật',
        'MedSerCode', COALESCE((
            SELECT jsonb_agg(c.macls)
            FROM ClsData c
            JOIN tmp_grouped_requests t ON t.medser_code = c.macls
            WHERE (
                COALESCE(t.para_qty, 0) != COALESCE(c.soluong, 0)
                OR COALESCE(t.bhyt, 0) != COALESCE(c.bhyt, 0)
                OR COALESCE(t.thuphi, 0) != COALESCE(c.thuphi, 0)
                OR COALESCE(t.dichvu, 0) != COALESCE(c.dichvu, 0)
                OR COALESCE(t.miengiam, 0) != COALESCE(c.miengiam, 0)
                OR COALESCE(t.ptmiengiam_input, 0) != COALESCE(c.ptmiengiam, 0)
            )
            AND (
                c.dathu != 0 OR 
                COALESCE(c.soctvpcl, '') != '' OR 
                c.dath != 0 OR 
                c.dalappttt != 0
                )
            ),'[]'::jsonb)
        );
    END IF;
    
    --Cập nhật lại các CLS đã xoá từ EMR
    UPDATE current.chidinhcls cls
          SET xoa = 1,
              ngayxoa = r_qtdieutri.ngaygio
          WHERE cls.idchidinh = v_paraclinreqcode
            AND cls.mabn = v_patientcode
            AND cls.makb = v_admissioncode
            AND cls.maba = v_medicalrecordno
            AND cls.xoa = 0
            AND cls.thangkt = r_qtdieutri.thangkt
            AND cls.namkt = r_qtdieutri.namkt
            AND NOT EXISTS (
                SELECT 1
                FROM tmp_grouped_requests req
                WHERE TRIM(req.medser_code) = TRIM(cls.macls)
            );
            
    --Tạo bảng đầy đủ dữ liệu đã group có cả cha và con
    CREATE TEMP TABLE tmp_data_ready ON COMMIT DROP AS
	SELECT
      req.medser_code,
      req.para_qty,
      COALESCE(req.bhyt,0) AS bhyt,
      req.tinhtrang AS tinhtrang,
      CASE WHEN COALESCE(req.bhyt,0) = 1 THEN 0 ELSE 1 END AS thuphi,
      req.dichvu,
      req.miengiam,
      req.ptmiengiam_input,
      req.thanhtienmg,      
      req.ngaykcb,
      req.is_child,
	  req.tenclsphu, --[NTV 2026-01-07: lấy thêm cột tenclsphu (PCReqDtlNotes)]
      CASE 
            WHEN r_bnnoitru.bhyt IN ('1','2') THEN
                (CASE
                    WHEN req.thuphi = 1 THEN cat.giadan07
                    WHEN req.dichvu = 1 THEN cat.giadv07
                    ELSE CASE WHEN sys_laygiadan::NUMERIC = 1 THEN cat.giadan07 ELSE cat.giabh07 END
                END)
            ELSE 
                (CASE WHEN sys_laygiadv::NUMERIC = 0 THEN cat.giadan07 ELSE cat.giadv07 END)
      END AS dongia,
      cat.giabh07 AS giabh,
      CASE 
            WHEN r_bnnoitru.bhyt IN ('1','2') THEN
                (CASE
                    WHEN req.dichvu = 1 AND cat.giadv07 > cat.giabh07 THEN cat.giadv07 - cat.giabh07
                    WHEN sys_laygiadan = '1' AND cat.giadan07 > cat.giabh07 THEN cat.giadan07 - cat.giabh07
                    ELSE 0
                END)
            ELSE 0
      END AS chenhlech,
      CASE
          WHEN req.miengiam = 1 AND req.thanhtienmg > 0 THEN
              ROUND(req.thanhtienmg / NULLIF(
                  CASE
                      WHEN r_bnnoitru.bhyt IN ('1','2') THEN
                          CASE
                              WHEN req.thuphi = 1 THEN cat.giadan07
                              WHEN req.dichvu = 1 THEN cat.giadv07
                              ELSE CASE WHEN sys_laygiadan = '1' THEN cat.giadan07 ELSE cat.giabh07 END
                          END
                      ELSE cat.giabh07
                  END, 0
              ) * 100, 2)
          ELSE 0
      END AS ptmiengiam,
      (
          COALESCE(
              CASE
                  WHEN r_bnnoitru.bhyt IN ('1','2') THEN
                      CASE
                          WHEN req.thuphi = 1 THEN cat.giadan07
                          WHEN req.dichvu = 1 THEN cat.giadv07
                          ELSE (CASE WHEN sys_laygiadan::NUMERIC = 1 THEN cat.giadan07 ELSE cat.giabh07 END)
                      END
                  ELSE (CASE WHEN sys_laygiadv::NUMERIC = 0 THEN cat.giadan07 ELSE cat.giadv07 END)
              END, 0
          ) * req.para_qty
      ) AS thanhtien,
      cat.ktcao, cat.ldanh, cat.tyle_tt, cat.giabhdm, cat.nguonkhac, cat.chiphint,
      --[NQHOA: 2025-10-02] LẤY THÊM THÔNG TIN THẺ 2 ĐỂ GÁN VÀO chidinhcls : toacon, macon và mathe
      CASE WHEN COALESCE(r_bnnoitru.ttcon,'') != '' THEN 2 ELSE 0 END AS toacon,
      COALESCE(r_bnnoitru.ttcon,'') AS macon, 
      CASE WHEN COALESCE(r_bnnoitru.ttcon,'') != '' THEN COALESCE(r_bnnoitru.mathe2,'') ELSE COALESCE(r_bnnoitru.mathe,'') END AS mathe
FROM tmp_grouped_requests req
JOIN (
    SELECT macls, giabh07, giadv07, giadan07, tyle_tt, nguonkhac,
           ktcao, ldanh, giabh07 AS giabhdm, bhyt, COALESCE(chiphint,0) AS chiphint
    FROM current.dmcls
) cat ON cat.macls = req.medser_code;

    --UPDATE các dòng đã có
    UPDATE current.chidinhcls cls
    SET soluong = d.para_qty,
        thuphi = d.thuphi,
        dongia = d.dongia,
        giabh = d.giabh,
        chenhlech = d.chenhlech,
        dichvu = d.dichvu,
        miengiam = d.miengiam,
        ptmiengiam = d.ptmiengiam,
        thanhtien = d.thanhtien,
        thanhtienmg = d.thanhtienmg,
        ngaycd = LOCALTIMESTAMP,
        ngaykcb = d.ngaykcb,
        taikhoan = r_qtdieutri.taikhoan,
        maphong = r_qtdieutri.maphong,
        ktcao = d.ktcao,
        ldanh = d.ldanh,
        tile = d.tyle_tt,
        bhyt = d.bhyt,
        tinhtrang = COALESCE((CASE WHEN d.tinhtrang ISNULL 
        THEN (CASE WHEN r_bnnoitru.tinhtrangvv::NUMERIC = 0 THEN 1 ELSE 0 END)
        ELSE d.tinhtrang END),0),
        --[NQHOA: 2025-10-02] Cập nhật lại thông tin CLS vào thẻ 2 nếu có
        toacon = COALESCE(d.toacon,0),
        macon = COALESCE(d.macon,''),
        mathe = COALESCE(d.mathe,''),
		tenclsphu = COALESCE(d.tenclsphu,'')
    FROM tmp_data_ready d
	WHERE cls.idchidinh = v_paraclinreqcode
  	AND cls.macls = d.medser_code
    AND cls.mabn = v_patientcode
    AND cls.makb = v_admissioncode
    AND cls.maba = v_medicalrecordno
    AND cls.thangkt = r_qtdieutri.thangkt
    AND cls.namkt = r_qtdieutri.namkt
  	AND cls.xoa = 0;

    --INSERT các dòng mới
    INSERT INTO current.chidinhcls (
        mabn, maba, makb, noitru, madt, madv, madv_dichvu, maphong,
        ngaykcb, manv, macls, soluong, thuphi, dongia, giabh, chenhlech,
        dichvu, miengiam, ptmiengiam, thanhtien, dath, dain, dathu, taikhoan,
        tenmay, xoa, thangkt, namkt, maicd, kqcdoan, mathe, thanhtienmg,
        iddienbien, tinhtrang, ngaycd, travedieutri, buong, sogiuong,
        toacon, macon, dongiausd, thanhtienusd, tygia, bhyt, ktcao, ldanh,
        pttraituyen, idchidinh, chiphint, tenclsphu, tile, giabhdm, maicdp,
        kqcdoanp, sophong, stt_led, dinhsuat, sdnguonkhac, ngaykq,
        mayhct, tenyhct, api
    )
    SELECT
        v_patientcode,                             -- mabn
        v_medicalrecordno,                         -- maba
        v_admissioncode,                           -- makb
        1,                                         -- noitru
        r_bnnoitru.madt,                           -- madt
        r_bnnoitru.madv,                           -- madv
        NULL,                                      -- madv_dichvu
        r_qtdieutri.maphong,                       -- maphong
        d.ngaykcb,                       		   -- ngaykcb
        r_qtdieutri.manv,                          -- manv
        d.medser_code,                             -- macls
        d.para_qty,                                -- soluong
        d.thuphi,                                  -- thuphi
        d.dongia,                                  -- dongia
        d.giabh,                                   -- giabh
        d.chenhlech,                               -- chenhlech
        d.dichvu,                                  -- dichvu
        d.miengiam,                                -- miengiam
        d.ptmiengiam,                              -- ptmiengiam
        d.thanhtien,                               -- thanhtien
        0,                                         -- dath
        0,                                         -- dain
        0,                                         -- dathu
        r_qtdieutri.taikhoan,                      -- taikhoan
        'EMR.DHS',                                 -- tenmay
        0,                                         -- xoa
        r_qtdieutri.thangkt,                       -- thangkt
        r_qtdieutri.namkt,                         -- namkt
        r_qtdieutri.maicd,                         -- maicd
        r_qtdieutri.kqcdoan,                       -- kqcdoan
        d.mathe,		                           -- mathe
        d.thanhtienmg,                             -- thanhtienmg
        v_tpcode,                                  -- iddienbien
        CASE WHEN d.tinhtrang ISNULL 
        THEN (CASE WHEN r_bnnoitru.tinhtrangvv::NUMERIC = 0 THEN 1 ELSE 0 END)
        ELSE d.tinhtrang END,           			   -- tinhtrang
        LOCALTIMESTAMP,                       	   -- ngaycd
        0,                                         -- travedieutri
        r_qtdieutri.maphong,                       -- buong
        r_qtdieutri.sogiuong,                      -- sogiuong
        d.toacon,                                  -- toacon
        d.macon,                                   -- macon
        0,                                         -- dongiausd
        0,                                         -- thanhtienusd
        0,                                         -- tygia
        d.bhyt,                                    -- bhyt
        d.ktcao,                                   -- ktcao
        d.ldanh,                                   -- ldanh
        d.tyle_tt,                                 -- pttraituyen
        v_paraclinreqcode,                         -- idchidinh
        d.chiphint,                                -- chiphint
        d.tenclsphu,                               -- tenclsphu [NTV 2026-01-07: thêm tenclsphu]
        d.tyle_tt,                                 -- tile
        d.giabhdm,                                 -- giabhdm
        r_qtdieutri.maicdp,                        -- maicdp
        r_qtdieutri.kqcdoanp,                      -- kqcdoanp
        NULL,                                      -- sophong
        NULL,                                      -- stt_led
        0,                                         -- dinhsuat
        d.nguonkhac,                               -- sdnguonkhac
        NULL,                                      -- ngaykq        
        r_qtdieutri.mayhct,                        -- mayhct
        r_qtdieutri.tenyhct,                       -- tenyhct
        1                                          -- api
    FROM tmp_data_ready d
    WHERE NOT EXISTS (
    SELECT 1 FROM current.chidinhcls cls
    WHERE cls.idchidinh = v_paraclinreqcode
      AND cls.macls = d.medser_code
      AND cls.mabn = v_patientcode
      AND cls.makb = v_admissioncode
      AND cls.maba = v_medicalrecordno
      AND cls.thangkt = r_qtdieutri.thangkt
      AND cls.namkt = r_qtdieutri.namkt
      AND cls.xoa = 0);

    RETURN jsonb_build_object('status', 'success', 'message', 'Ok');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
