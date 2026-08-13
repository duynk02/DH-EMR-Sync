-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-07-01
-- Hàm: badt_dhs.deleteTPPrescription(input_json JSONB)
-- Mô tả:
--   - PatientCode			Mã số bệnh nhân
--   - MedicalRecordNo			Mã số bệnh án
--   - TPCode	ID diễn biến
--   - PresCode			số hóa đơn
-- Sử dụng:
/*
   SELECT * FROM badt_dhs.deleteTPPrescription('{
    "PatientCode": "2025019872",
    "MedicalRecordNo": "2025007173",
    "TPCode": "DH3.X25.0702.080350",
    "PresCode": "Z12.X25.0619.1308P7"
}'::jsonb) 
-- Xóa toa thuốc
*/
-- ===============================================================

CREATE OR REPLACE FUNCTION badt_dhs.deleteTPPrescription(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
  
  p_mabn TEXT := input_json->>'PatientCode';
  p_makh TEXT := input_json->>'MedicalRecordNo';
  p_makb TEXT := input_json->>'AdmissionCode';
  p_iddienbien TEXT := input_json->>'TPCode';
  p_sohd TEXT := input_json->>'PresCode';

  -- Biến dùng để gom thông tin trả về cho client
    v_exists           BOOLEAN;
    v_updated_inventory  INT := 0;
    v_deleted_detail     INT := 0;
    v_deleted_header     INT := 0;

    rec RECORD;
    r_ct RECORD;
BEGIN

    --[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = p_mabn AND maba = p_makh AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            p_mabn,  p_makh)
        );
    END IF;
    --[ntvuong: 2025-10-06] Kiểm tra chứng từ
    SELECT sohd, mabn, makh, iddienbien,COALESCE(dain,0) as dain, COALESCE(dathu,0) as dathu,COALESCE(ttchinhtoa,0) as ttchinhtoa
    INTO r_ct
    FROM   current.chungtu ct
    WHERE  ct.sohd        = p_sohd
      AND  ct.iddienbien  = p_iddienbien
      AND  ct.mabn        = p_mabn
      AND  ct.makh        = p_makh
      AND  COALESCE(xoa,0) = 0;

    IF COALESCE(r_ct.sohd,'') = '' THEN
		--[ntvuong] thay đổi thông báo warning --> error
		IF COALESCE(p_sohd,'') = '' THEN
	       	RETURN jsonb_build_object(
	            'status' , 'error',
	            'message', format('Số hóa đơn (PresCode) không được rỗng!')
	        );
       ELSE
       	RETURN jsonb_build_object(
            'status' , 'error',
            'message', format('PresCode = %s và TPCode = %s không tồn tại',
                              p_sohd, p_iddienbien)
        );
       END IF;
    END IF;
    
    -- Kiểm tra chứng từ đã phát thuốc hoặc thu tiền
    RAISE NOTICE 'Kiểm tra chứng từ đã phát thuốc hoặc thu tiền';
    IF COALESCE(r_ct.dain,0) = 1 OR COALESCE(r_ct.dathu,0) = 1 THEN
        RETURN json_build_object(
            'status', 'error',
            'message', 'Không thể xóa!. Chứng từ đã phát thuốc hoặc thu tiền.'
        );
    END IF;
    
    -- Kiểm tra chứng từ đã tổng hợp tại khoa
    RAISE NOTICE 'Kiểm tra chứng từ đã tổng hợp tại khoa';
    IF COALESCE(r_ct.ttchinhtoa,0) = 5 THEN
        RETURN json_build_object(
            'status', 'error',
            'message', 'Không thể xóa!. Chứng từ đã được tổng hợp tại khoa.'
        );
    END IF;
    --1.
	FOR rec IN
        SELECT hd.sohd, ngayhd, hd.mabn, makh, mahh, giavat, giaban, COALESCE(giabhyt,0) giabhyt, soluong,
				handung, solo, visa, thangkt, namkt, khole
        FROM current.pshdxn hd
        WHERE  hd.sohd        = p_sohd
          AND  hd.iddienbien  = p_iddienbien
          AND  hd.mabn        = p_mabn
          AND  hd.makh        = p_makh
          AND  COALESCE(xoa,0) = 0
        FOR UPDATE
    LOOP
    --
    UPDATE current.pstonkho
        SET    tamxuat = tamxuat - rec.soluong
        WHERE  mahh     = rec.mahh
          AND  giavat::NUMERIC   = rec.giavat::NUMERIC
          AND  handung  = rec.handung
          AND  solo     = rec.solo
          AND  thangkt  = rec.thangkt
          AND  namkt    = rec.namkt
          AND  khocp    = rec.khole;

        IF NOT FOUND THEN
            RAISE EXCEPTION
              'Không tìm thấy (hoặc trùng khớp) dòng tồn kho cho mahh=%, giavat=%,handung=%, solo=%,thangkt=%, namkt=%, khocp=%',
              rec.mahh, rec.giavat, rec.handung, rec.solo, rec.thangkt, rec.namkt, rec.khole;
        END IF;

        v_updated_inventory := v_updated_inventory + 1;
    END LOOP;
    --2.
    UPDATE current.pshdxn hd
    SET    xoa     = 1,
           ngayxoa = CURRENT_TIMESTAMP
    WHERE  hd.sohd        = p_sohd
      AND  hd.iddienbien  = p_iddienbien
      AND  hd.mabn        = p_mabn
      AND  makh        = p_makh
      AND  COALESCE(xoa,0) = 0;

    GET DIAGNOSTICS v_deleted_detail = ROW_COUNT;

    --3.
    UPDATE current.chungtu ct
    SET    xoa     = 1,
           ngayxoa = CURRENT_TIMESTAMP
    WHERE  ct.sohd        = p_sohd
      AND  ct.iddienbien  = p_iddienbien
      AND  ct.mabn        = p_mabn
      AND  ct.makh        = p_makh
      AND  COALESCE(xoa,0) = 0;

    GET DIAGNOSTICS v_deleted_header = ROW_COUNT;

    --4.
    RETURN jsonb_build_object(
        'status'            , 'success',
        'message'           , format('Đã xóa hóa đơn %s (iddienbien=%s)', p_sohd, p_iddienbien)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status' , 'error',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
