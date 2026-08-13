-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-08-11
-- Hàm: badt_dhs.cancelTPPrescription(input_json JSONB)
-- Mô tả: Hủy 1 thuốc trong toa
--   input_json: nội dung file json: thông tin bệnh nhân và toa thuốc
-- Sử dụng:
--   SELECT badt_dhs.cancelTPPrescription(input_json JSONB);
--   Nếu thuốc đã tổng hơp --> tạo toa trả với thông tin thuốc trong json --> theo tháng năm kế toán hiện tại
--   Nếu thuốc thuốc chưa tổng hợp --> xóa thuốc trong pshdxn --> tăng pstonkho.tamnhap --> xóa chungtu hoặc điều chỉnh theo thuốc còn lại trong pshdxn
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.cancelTPPrescription(input_json JSONB )
RETURNS JSONB AS $$
DECLARE
    p_mabn TEXT := input_json->>'PatientCode'; --Mã bệnh nhân
    p_makh TEXT := input_json->>'MedicalRecordNo'; -- Mã bệnh án
    p_makb TEXT := input_json->>'AdmissionCode'; -- Mã khám bệnh
    p_iddienbien TEXT := input_json->>'TPCode'; -- ID diễn biến
    p_sohd TEXT := input_json->>'PresCode'; -- Số hd
    p_mahh TEXT := input_json->>'PresDtlCode'; --Mã hàng hóa

    --Số lượng thuốc ngưng sử dụng
    p_sang NUMERIC := input_json->>'CancelMorningQty'; --Số lượng thuốc ngưng sáng
    p_trua NUMERIC := input_json->>'CancelMiddayQty'; --Số lượng thuốc ngưng trưa
    p_chieu NUMERIC := input_json->>'CancelAfternoonQty'; --Số lượng thuốc chiều
    p_toi NUMERIC := input_json->>'CancelEveningQty'; --Số lượng thuốc tối

    p_soluong NUMERIC := input_json->>'CancelDispenseQty'; --Tổng số lượng thuốc ngưng
    p_matutruc TEXT := COALESCE(input_json->>'Matutruc',''); --Mã tủ trực

    tong_thanhtien NUMERIC := 0;
    tong_thanhtienbhyt NUMERIC := 0;
    tong_thanhtienvat NUMERIC := 0;
    tong NUMERIC := 0;
    so_mahh NUMERIC := 0;
    tong_tien_tra NUMERIC := 0;
    tong_tien_bhyt_tra NUMERIC := 0;
    sl_xuat_tutruc NUMERIC := 0;

    r_hd RECORD;
    r_ct RECORD;

    thangnam TEXT;
    thangkt_S TEXT;
    namkt_S TEXT;
    v_code TEXT;

    r_mahh TEXT:='';
    r_sohd TEXT:='';
    r_matutuc TEXT:='';
	r_kyhieu TEXT:=''; --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
	t_loaixn TEXT:=''; --Loại trả: nkt, tto

    v_dain_exists BOOLEAN;
    v_matutruc_exists BOOLEAN;
    v_toatutruc_exists BOOLEAN;

BEGIN

    --[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = p_mabn AND maba = p_makh AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message',
            format('Mabn: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)',
            p_mabn, p_makh)
        );
    END IF;

    -- Lấy tháng năm kế toán
    SELECT giatri INTO thangnam FROM current.system WHERE tents = 'thanglv';
    	thangkt_S := SPLIT_PART(thangnam, '/', 1);
        namkt_S := SPLIT_PART(thangnam, '/', 2);

    --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
    SELECT COALESCE(sohd,'') sohd, COALESCE(mahh,'') mahh, COALESCE(tutruc,'') tutruc, COALESCE(kyhieu,'') kyhieu INTO r_sohd, r_mahh, r_matutuc, r_kyhieu
    FROM current.pshdxn
    WHERE mabn = p_mabn
      AND makh = p_makh
      AND sohd = p_sohd
      AND mahh = p_mahh
      AND COALESCE(xoa, 0) = 0 ;

	IF r_kyhieu = 'TMO' THEN
		t_loaixn = 'tto';
	ELSE
		t_loaixn = 'nkt';
	END IF;

    RAISE NOTICE 'p_mabn: %', p_mabn;
    RAISE NOTICE 'p_makh: %', p_makh;
    RAISE NOTICE 'p_sohd: %', p_sohd;
    RAISE NOTICE 'p_mahh: %', p_mahh;

    RAISE NOTICE 'mahh: %', COALESCE(r_mahh,'');
    RAISE NOTICE 'sohd: %', COALESCE(r_sohd,'');
    RAISE NOTICE 'tutruc: %', COALESCE(r_matutuc,'');

    IF COALESCE(r_mahh,'') = '' THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('PresDtlCode: %s không tồn tại', p_mahh)
        );
    END IF;

    IF COALESCE(r_sohd,'') = '' THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Hóa đơn %s (iddienbien=%s) không tồn tại', p_sohd, p_iddienbien)
        );
    END IF;


    IF  COALESCE(r_matutuc,'') != '' THEN -- toa tủ trực
    	SELECT EXISTS (
          SELECT 1 FROM current.dmdonvi WHERE madv = p_matutruc AND COALESCE(xoa, 0) = 0
      ) INTO v_matutruc_exists;

      IF NOT v_matutruc_exists  THEN
          RETURN jsonb_build_object(
              'status', 'warning',
              'message', format('Mã tủ trực: %s không tồn tại', p_matutruc)
          );
      END IF;

      SELECT EXISTS (
          SELECT 1
          FROM current.pshdxn
          WHERE mabn = p_mabn
            AND makh = p_makh
            AND sohd = p_sohd
            AND mahh = p_mahh
            AND tutruc = p_matutruc
            AND COALESCE(xoa, 0) = 0
      ) INTO v_toatutruc_exists;

      IF NOT v_toatutruc_exists  THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Toa tủ trực : %s không tồn tại', p_sohd)
        );
      END IF;

        -- [2025-09-25]: Vương chỉnh
        v_code := to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || UPPER(substring(md5(random()::text), 1, 4));

        --Kiểm tra số lượng xuất - trả
        SELECT Sum(toncuoi) AS toncuoi INTO sl_xuat_tutruc
        FROM
            ( SELECT Sum(soluong) AS toncuoi
              FROM CURRENT.pshdxn
              WHERE mahh = p_mahh
                    AND makh = p_makh
                    AND COALESCE(tutruc,'') = p_matutruc
                    AND sohd = p_sohd
                    AND loaixn = 'xbb'
                    AND toatutruc IN (1,2)
                    AND COALESCE(noitru,0) = 1
                    AND COALESCE(xoa,0) = 0
                    AND COALESCE(toacon, 0) = 0
        UNION
            SELECT Sum(-soluong) AS toncuoi
            FROM CURRENT.pshdxn
            WHERE mahh = p_mahh
                    AND makh = p_makh
                    AND COALESCE(tutruc,'') = p_matutruc
                    AND sohdx = p_sohd
                    AND loaixn = 'ttt'
                    AND COALESCE(noitru,0) = 1
                    AND COALESCE(xoa,0) = 0
                    AND COALESCE(toacon, 0) = 0
                    AND COALESCE(thanhtoan, '') = ''
        ) AS tam;

        IF p_soluong > sl_xuat_tutruc THEN
        	RETURN jsonb_build_object(
              'status', 'warning',
              'message', format('Số lượng trả lớn hơn số lượng xuất: trả %s, xuất %s', p_soluong,sl_xuat_tutruc)
          );
        END IF;
         --TUTRUC
         -- Lấy chi tiết thuốc trả
          FOR r_hd IN
              SELECT *, p_soluong as soluong_tra
              FROM current.pshdxn hd
              WHERE hd.mahh = p_mahh
                AND hd.sohd = p_sohd
                AND hd.mabn = p_mabn
                AND hd.makh = p_makh
                AND hd.tutruc = p_matutruc
                AND COALESCE(hd.xoa, 0) = 0
          LOOP
              IF COALESCE(r_hd.soluong, 0) > 0 THEN
                  -- Ghi vào pshdxn
                  INSERT INTO current.pshdxn(
                      sohd, sohdx, iddienbien, mabn, makh,
                      mahh, ngayhd, ngaylap, giolap, madv,
                      soluong, sang, trua, chieu, toi, lieu_dung, cachuong,
                      giaban, giavat, giabhyt, thanhtien, thanhtienbhyt, bhyt,
                      handung, solo, visa, thangkt, namkt,
                      stt, loaixn, noitru, khole, toaxv,
                      madt, khochan, theodon, tienvat, tenmay, loaitoa, thanhtoan,
                      tutruc, dain, toatutruc, kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
                  )
                  VALUES (
                      v_code, r_hd.sohd, r_hd.iddienbien, r_hd.mabn, r_hd.makh,
                      r_hd.mahh, r_hd.ngayhd, r_hd.ngaylap, now(), r_hd.madv,
                      r_hd.soluong_tra, r_hd.sang, r_hd.trua, r_hd.chieu, r_hd.toi, r_hd.lieu_dung, r_hd.cachuong,
                      r_hd.giaban, r_hd.giavat, r_hd.giabhyt, 
                      ROUND(r_hd.soluong_tra * COALESCE(r_hd.giavat, 0), 0),
                      ROUND(r_hd.soluong_tra * COALESCE(r_hd.giabhyt, 0), 0), r_hd.bhyt, --[NTVUONG: 2025-12-10] Tính lại thanhtien
                      r_hd.handung, r_hd.solo, r_hd.visa, thangkt_S, namkt_S,
                      r_hd.stt, 'ttt', r_hd.noitru, r_hd.khole, 0,
                      r_hd.madt, r_hd.khochan, r_hd.theodon, r_hd.tienvat, r_hd.tenmay, r_hd.loaitoa, r_hd.thanhtoan,
                      r_hd.tutruc, 1,1, COALESCE(r_hd.kyhieu,'') --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
                  );

                  -- Cập nhật tồn kho tủ trưc
                  UPDATE current.pstonkho
                  SET nhap = COALESCE(nhap, 0) + COALESCE(r_hd.soluong_tra,0),
                      toncuoi = COALESCE(toncuoi, 0) + COALESCE(r_hd.soluong_tra,0)
                  WHERE COALESCE(mahh, '') = COALESCE(r_hd.mahh, '')
                    AND COALESCE(giavat, 0) = COALESCE(r_hd.giavat, 0)
                    AND COALESCE(madv, '') = COALESCE(r_hd.tutruc, '')
                    AND COALESCE(handung, '') = COALESCE(r_hd.handung, '')
                    AND COALESCE(thangkt, '') = COALESCE(thangkt_S, '')
                    AND COALESCE(namkt, '') = COALESCE(namkt_S, '');

                  -- Cộng tổng
                  tong_thanhtien := tong_thanhtien + COALESCE(r_hd.thanhtien, 0);
                  tong_thanhtienbhyt := tong_thanhtienbhyt + COALESCE(r_hd.thanhtienbhyt, 0);
                  tong_thanhtienvat := tong_thanhtienvat + COALESCE(r_hd.tienvat, 0);
                  tong_tien_tra := tong_tien_tra + COALESCE(r_hd.giavat, 0) * COALESCE(r_hd.soluong_tra, 0);
                  tong_tien_bhyt_tra := tong_tien_bhyt_tra + COALESCE(r_hd.giabhyt, 0) * COALESCE(r_hd.soluong_tra, 0);
              END IF;
          END LOOP;

          -- Ghi chứng từ
          FOR r_ct IN
              SELECT *
              FROM current.chungtu ct
              WHERE ct.sohd = p_sohd
                AND ct.mabn = p_mabn
                AND ct.makh = p_makh
                AND ct.tutruc = p_matutruc
                AND COALESCE(ct.xoa, 0) = 0
          LOOP
              INSERT INTO current.chungtu(
                  sohd, sohdx, iddienbien, mabn, makh, madt, madv,
                  manv, ngayuong, ghichu, khole,
                  ngayhd, ngaylap, giolap, thanhtien, thangkt, namkt,
                  loaixn, noitru, taikhoan, maicd, kqcdoan, maicdp, kqcdoanp, api, thanhtoan, toaxv,
                  khochan, tienvat, tenmay, taikham, loaitoa, mathe, thanhtienbhyt, mayhct, tenyhct,
                  tutruc, dain, toatutruc, kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
              )
              VALUES (
                  v_code, '', r_ct.iddienbien, r_ct.mabn, r_ct.makh, r_ct.madt, r_ct.madv, --[ntvuong] 2025-10-02: không ghi nhận sohdx của ct trả
                  r_ct.manv, r_ct.ngayuong, r_ct.ghichu, r_ct.khole,
                  r_ct.ngayhd, r_ct.ngaylap, now(), tong_thanhtien, thangkt_S, namkt_S,
                  'ttt', r_ct.noitru, r_ct.taikhoan, r_ct.maicd, r_ct.kqcdoan, r_ct.maicdp, r_ct.kqcdoanp, r_ct.api, r_ct.thanhtoan, r_ct.toaxv,
                  r_ct.khochan, tong_thanhtienvat, r_ct.tenmay, r_ct.taikham, r_ct.loaitoa, r_ct.mathe, tong_thanhtienbhyt, r_ct.mayhct, r_ct.tenyhct,
                  r_ct.tutruc, 1,1, COALESCE(r_ct.kyhieu,'') --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
              );
          END LOOP;

          RETURN jsonb_build_object(
              'status', 'success',
              'message', format('Thêm thành công chứng từ trả tủ trực %s, chứng từ mới: %s',p_matutruc, v_code)
          );
         --ENDTUTRUC
    ELSE --toa thường
		-- 1. Kiểm tra nếu chungtu đã thu tiền và chưa tổng hợp
        --[NTVUONG: 2026-01-09] Kiểm tra không cho ngưng thuốc nếu chungtu đã thu tiền và chưa tổng hợp --> muốn ngưng thuốc phải hủy phiếu thu
        IF EXISTS (
            SELECT 1
            FROM current.chungtu
            WHERE mabn = p_mabn 
              AND makh = p_makh 
              AND sohd = p_sohd
              AND COALESCE(xoa,0) = 0
              AND COALESCE(dain,0) = 0 
			  AND COALESCE(dathu,0) = 1
        ) THEN
            RETURN json_build_object(
                'status', 'error',
                'message', 'Không thể ngưng thuốc. Chứng từ đã thu tiền.'
            );
        END IF;
        -- 2. Kiểm tra đã in chứng từ hay chưa
        SELECT EXISTS (
            SELECT 1
            FROM current.pshdxn
            WHERE mabn = p_mabn
              AND makh = p_makh
              AND sohd = p_sohd
              AND mahh = p_mahh
              AND COALESCE(xoa, 0) = 0
              AND COALESCE(dain, 0) = 1
        ) INTO v_dain_exists;

    	IF v_dain_exists THEN

		-- [2025-09-25]: Vương chỉnh
        v_code := to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || UPPER(substring(md5(random()::text), 1, 4));
        --

        -- 1. Kiểm tra còn đủ số lượng để trả
        SELECT SUM(CASE WHEN loaixn = 'xbb' AND COALESCE(dain,0) = 1 THEN soluong ELSE 0 END)
             - SUM(CASE WHEN loaixn = 'nkt' OR loaixn = 'tto' THEN soluong ELSE 0 END)
        INTO tong
        FROM current.pshdxn
        WHERE mabn = p_mabn
          AND makh = p_makh
          AND mahh = p_mahh
		  AND COALESCE(kyhieu,'') = r_kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
          AND COALESCE(xoa, 0) = 0;

        IF tong <= 0 THEN
            RETURN jsonb_build_object(
                'status', 'warning',
                'message', format('Thuốc/vật tư %s đã trả đủ số lượng, không thể trả thêm', p_mahh)
            );
        END IF;

        --Kiểm tra số lượng còn lại
        IF p_soluong > tong THEN
            RETURN jsonb_build_object(
                'status', 'warning',
                'message', format('Thuốc/vật tư %s, số lượng trả %s > số lượng còn lại %s, không đủ để trả', p_mahh,p_soluong,tong)
            );
        END IF;

        -- Lấy chi tiết thuốc trả
        FOR r_hd IN
            SELECT *, p_soluong as soluong_tra
            FROM current.pshdxn hd
            WHERE hd.mahh = p_mahh
              AND hd.sohd = p_sohd
              AND hd.mabn = p_mabn
              AND hd.makh = p_makh
              AND COALESCE(hd.xoa, 0) = 0
        LOOP
            IF COALESCE(r_hd.soluong, 0) > 0 THEN
                -- Ghi vào pshdxn
                INSERT INTO current.pshdxn(
                    sohd, sohdx, iddienbien, mabn, makh,
                    mahh, ngayhd, ngaylap, giolap, madv,
                    soluong, sang, trua, chieu, toi, lieu_dung, cachuong,
                    giaban, giavat, giabhyt, thanhtien, thanhtienbhyt, bhyt,
                    handung, solo, visa, thangkt, namkt,
                    stt, loaixn, noitru, khole, toaxv,
                    madt, khochan, theodon, tienvat, tenmay, loaitoa, thanhtoan, kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
                )
                VALUES (
                    v_code, r_hd.sohd, r_hd.iddienbien, r_hd.mabn, r_hd.makh,
                    r_hd.mahh, r_hd.ngayhd, r_hd.ngaylap, now(), r_hd.madv,
                    r_hd.soluong_tra, r_hd.sang, r_hd.trua, r_hd.chieu, r_hd.toi, r_hd.lieu_dung, r_hd.cachuong,
                    r_hd.giaban, r_hd.giavat, r_hd.giabhyt, 
                    ROUND(r_hd.soluong_tra * COALESCE(r_hd.giavat, 0), 0),
                    ROUND(r_hd.soluong_tra * COALESCE(r_hd.giabhyt, 0), 0), r_hd.bhyt, --[NTVUONG: 2025-12-10] Tính lại thanhtien
                    r_hd.handung, r_hd.solo, r_hd.visa, thangkt_S, namkt_S,
                    r_hd.stt, t_loaixn, r_hd.noitru, r_hd.khole, 0,
                    r_hd.madt, r_hd.khochan, r_hd.theodon, r_hd.tienvat, r_hd.tenmay, r_hd.loaitoa, r_hd.thanhtoan, COALESCE(r_hd.kyhieu,'')  --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
                );

                -- Cập nhật tồn kho
                UPDATE current.pstonkho
                SET tamnhap = COALESCE(tamnhap, 0) + COALESCE(r_hd.soluong_tra, 0)
                WHERE COALESCE(mahh, '') = COALESCE(r_hd.mahh, '')
                  AND COALESCE(giavat, 0) = COALESCE(r_hd.giavat, 0)
                  AND COALESCE(khocp, '') = COALESCE(r_hd.khole, '')
                  AND COALESCE(handung, '') = COALESCE(r_hd.handung, '')
                  AND COALESCE(thangkt, '') = COALESCE(thangkt_S, '')
                  AND COALESCE(namkt, '') = COALESCE(namkt_S, '');

                -- Cộng tổng
                tong_thanhtien := tong_thanhtien + COALESCE(r_hd.thanhtien, 0);
                tong_thanhtienbhyt := tong_thanhtienbhyt + COALESCE(r_hd.thanhtienbhyt, 0);
                tong_thanhtienvat := tong_thanhtienvat + COALESCE(r_hd.tienvat, 0);
                tong_tien_tra := tong_tien_tra + COALESCE(r_hd.giavat, 0) * COALESCE(r_hd.soluong_tra, 0);
                tong_tien_bhyt_tra := tong_tien_bhyt_tra + COALESCE(r_hd.giabhyt, 0) * COALESCE(r_hd.soluong_tra, 0);
            END IF;
        END LOOP;

        -- Ghi chứng từ
        FOR r_ct IN
            SELECT *
            FROM current.chungtu ct
            WHERE ct.sohd = p_sohd
              AND ct.mabn = p_mabn
              AND ct.makh = p_makh
              AND COALESCE(ct.xoa, 0) = 0
        LOOP
            INSERT INTO current.chungtu(
                sohd, sohdx, iddienbien, mabn, makh, madt, madv,
                manv, ngayuong, ghichu, khole,
                ngayhd, ngaylap, giolap, thanhtien, thangkt, namkt,
                loaixn, noitru, taikhoan, maicd, kqcdoan, maicdp, kqcdoanp, api, thanhtoan, toaxv,
                khochan, tienvat, tenmay, taikham, loaitoa, mathe, thanhtienbhyt, mayhct, tenyhct, kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
            )
            VALUES (
                v_code, '', r_ct.iddienbien, r_ct.mabn, r_ct.makh, r_ct.madt, r_ct.madv, --[ntvuong] 2025-10-02: không ghi nhận sohdx của ct trả
                r_ct.manv, r_ct.ngayuong, r_ct.ghichu, r_ct.khole,
                r_ct.ngayhd, r_ct.ngaylap, now(), tong_thanhtien, thangkt_S, namkt_S,
                t_loaixn, r_ct.noitru, r_ct.taikhoan, r_ct.maicd, r_ct.kqcdoan, r_ct.maicdp, r_ct.kqcdoanp, r_ct.api, r_ct.thanhtoan, r_ct.toaxv,
                r_ct.khochan, tong_thanhtienvat, r_ct.tenmay, r_ct.taikham, r_ct.loaitoa, r_ct.mathe, tong_thanhtienbhyt, r_ct.mayhct, r_ct.tenyhct, COALESCE(r_ct.kyhieu,'') --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
            );
        END LOOP;

        RETURN jsonb_build_object(
            'status', 'success',
            'message', format('Thêm thành công chứng từ trả %s', v_code)
        );

    ELSE -- Thuốc chưa tổng hợp ---cập nhật [08/09/2025]
		SELECT COUNT(DISTINCT mahh) INTO so_mahh
        FROM current.pshdxn
        WHERE mabn = p_mabn
          AND makh = p_makh
          AND sohd = p_sohd
          AND COALESCE(xoa,0) = 0
          AND COALESCE(dain,0) = 0;

        -- Lấy chi tiết thuốc trả
        FOR r_hd IN
            SELECT *, p_soluong as soluong_tra
            FROM current.pshdxn hd
            WHERE hd.mahh = p_mahh
              AND hd.sohd = p_sohd
              AND hd.mabn = p_mabn
              AND hd.makh = p_makh
              AND hd.soluong >= p_soluong --[VUONG] them theo yeu cầu
              AND COALESCE(hd.xoa, 0) = 0
              AND COALESCE(hd.dain, 0) = 0
        LOOP
            RAISE NOTICE 'soluong_tra: %',
                  p_soluong;
            IF COALESCE(r_hd.soluong_tra, 0) > 0 THEN --soluong --> soluong_tra
                IF COALESCE(r_hd.soluong_tra, 0) = COALESCE(r_hd.soluong, 0) THEN
                 RAISE NOTICE 'soluong=nhau -->xóa: %',
                  r_hd.soluong;
                -- UPDATE
                UPDATE CURRENT.pshdxn SET xoa = 1, ngayxoa = NOW()
                WHERE mahh = p_mahh
                      AND sohd = p_sohd
                      AND mabn = p_mabn
                      AND makh = p_makh
                      AND soluong = r_hd.soluong_tra;
                ELSE --So luong tra < soluong
                RAISE NOTICE 'soluong > hơn -->giảm: %', r_hd.soluong;
                UPDATE CURRENT.pshdxn SET
                	sang = COALESCE(sang,0) - COALESCE(p_sang,0),
                    trua = COALESCE(trua,0) - COALESCE(p_trua,0),
                    chieu = COALESCE(chieu,0) - COALESCE(p_chieu,0),
                    toi = COALESCE(toi,0) - COALESCE(p_toi,0),
                    soluong = soluong - r_hd.soluong_tra,
                    thanhtien = (r_hd.soluong - r_hd.soluong_tra) * COALESCE(r_hd.giavat,0),
                    thanhtienbhyt = (r_hd.soluong - r_hd.soluong_tra) * COALESCE(r_hd.giabhyt,0)
                WHERE mahh = p_mahh
                      AND sohd = p_sohd
                      AND mabn = p_mabn
                      AND makh = p_makh
                      AND soluong > r_hd.soluong_tra;
                END IF;

                -- Cập nhật tồn kho
                RAISE NOTICE 'Cập nhật tồn kho, chưa tổng hợp: %', r_hd.soluong_tra;
                UPDATE current.pstonkho
                SET tamxuat = COALESCE(tamxuat, 0) - COALESCE(r_hd.soluong_tra, 0)
                WHERE COALESCE(mahh, '') = COALESCE(r_hd.mahh, '')
                  AND COALESCE(giavat, 0) = COALESCE(r_hd.giavat, 0)
                  AND COALESCE(khocp, '') = COALESCE(r_hd.khole, '')
                  AND COALESCE(handung, '') = COALESCE(r_hd.handung, '')
                  AND COALESCE(thangkt, '') = COALESCE(thangkt_S, '')
                  AND COALESCE(namkt, '') = COALESCE(namkt_S, '');

                -- Cộng tổng
                tong_thanhtien := tong_thanhtien + COALESCE(r_hd.thanhtien, 0);
                tong_thanhtienbhyt := tong_thanhtienbhyt + COALESCE(r_hd.thanhtienbhyt, 0);
                tong_thanhtienvat := tong_thanhtienvat + COALESCE(r_hd.tienvat, 0);
                tong_tien_tra := tong_tien_tra + COALESCE(r_hd.giavat, 0) * COALESCE(r_hd.soluong_tra, 0);
                tong_tien_bhyt_tra := tong_tien_bhyt_tra + COALESCE(r_hd.giabhyt, 0) * COALESCE(r_hd.soluong_tra, 0);

                RAISE NOTICE 'tong_thanhtien: %', tong_thanhtien;
                RAISE NOTICE 'tong_thanhtienbhyt: %', tong_thanhtienbhyt;
                RAISE NOTICE 'tong_thanhtienvat: %', tong_thanhtienvat;
                RAISE NOTICE 'tong_tien_tra: %', tong_tien_tra;
                RAISE NOTICE 'tong_tien_bhyt_tra: %', tong_tien_bhyt_tra;
            END IF;
        END LOOP;

        -- Ghi chứng từ
        FOR r_ct IN
            SELECT *
            FROM current.chungtu ct
            WHERE ct.sohd = p_sohd
              AND ct.mabn = p_mabn
              AND ct.makh = p_makh
              AND COALESCE(ct.xoa, 0) = 0
        LOOP
            IF so_mahh = 1 THEN --xóa chưng từ
                -- UPDATE
                RAISE NOTICE 'Tổng tiền chứng từ %', r_ct.thanhtien;
                IF r_ct.thanhtien = tong_tien_tra THEN
                  RAISE NOTICE 'Xoa chứng từ %', r_ct.sohd;
                  UPDATE CURRENT.chungtu SET xoa = 1, ngayxoa = NOW()
                  WHERE sohd = p_sohd
                        AND mabn = p_mabn
                        AND makh = p_makh;
                ELSE
                    RAISE NOTICE 'Cập nhật chứng từ %', r_ct.sohd;
                	UPDATE CURRENT.chungtu SET
                      thanhtien = thanhtien - tong_tien_tra,
                      tienvat = tienvat - tong_tien_tra,
                      thanhtienbhyt = thanhtienbhyt - tong_tien_bhyt_tra
                  WHERE sohd = p_sohd
                        AND mabn = p_mabn
                        AND makh = p_makh;
                END IF;
            ELSE -- cập nhật chứng từ theo tiền còn lại lại
                RAISE NOTICE 'Cập nhật chứng từ, còn lại %', r_ct.sohd;
            	UPDATE CURRENT.chungtu SET
                	thanhtien = thanhtien - tong_tien_tra,
                    tienvat = tienvat - tong_tien_tra,
                    thanhtienbhyt = thanhtienbhyt - tong_tien_bhyt_tra
                WHERE sohd = p_sohd
                      AND mabn = p_mabn
                      AND makh = p_makh;

            END IF;

        END LOOP;

        RETURN jsonb_build_object(
            'status', 'success',
            'message', format('Cập nhật thành công chứng từ %s', p_sohd)
        );
    END IF;
  END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;


