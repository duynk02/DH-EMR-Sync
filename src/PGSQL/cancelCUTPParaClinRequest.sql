-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-08-11
-- Hàm: badt_dhs.cancelCUTPParaClinRequest(input_json JSONB)
-- Mô tả: Hủy 1 thuốc trong toa
--   input_json: nội dung file json: thông tin bệnh nhân và toa thuốc
-- Sử dụng:
--   SELECT badt_dhs.cancelCUTPParaClinRequest(input_json JSONB);
--   Kiểm tra cls và xóa 1 cls hoặc bộ cls
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.cancelCUTPParaClinRequest(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
    p_mabn TEXT := input_json->>'PatientCode'; --Mã bệnh nhân
    p_maba TEXT := input_json->>'MedicalRecordNo'; -- Mã bệnh án
    p_makb TEXT := input_json->>'AdmissionCode'; -- Mã khám bệnh
    p_iddienbien TEXT := input_json->>'TPCode'; -- ID diễn biến
    p_idchidinh TEXT := input_json->>'ParaClinReqCode'; -- ID chỉ định
    p_macls TEXT := input_json->>'PCReqDltVoucherNo'; --Mã CLS

    r_cls RECORD;
    v_exists BOOLEAN;
    v_ravien BOOLEAN;
    v_dathu_dathu BOOLEAN := FALSE;
BEGIN

    --[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = p_mabn AND makb = p_makb AND maba = p_maba AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            p_mabn, p_makb, p_maba)
        );
    END IF;

    -- 0. Kiểm tra chứng từ tồn tại
    SELECT EXISTS (
        SELECT 1
        FROM current.bnnoitru
        WHERE mabn = p_mabn
          AND maba = p_maba
          AND makb = p_makb
          AND COALESCE(ravien, 0) > 0
    ) INTO v_ravien;

    IF  v_ravien THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Bệnh nhân %s đã xuất viện', p_maba)
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM current.chidinhcls
        WHERE mabn = p_mabn
          AND maba = p_maba
          AND makb = p_makb
          AND iddienbien = p_iddienbien
          AND idchidinh = p_idchidinh
          AND COALESCE(xoa, 0) = 0
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('ID diễn biến %s (idchidinh=%s) không tồn tại', p_iddienbien, p_idchidinh)
        );
    END IF;

    IF v_exists THEN
        --Kiểm tra CLS có xóa hay chưa
        FOR r_cls IN
          SELECT mabn, maba, makb, idchidinh, iddienbien, macls, dathu, dath, dalappttt
          FROM current.chidinhcls
          WHERE mabn = p_mabn
              AND maba = p_maba
              AND makb = p_makb
              AND iddienbien = p_iddienbien
              AND idchidinh = p_idchidinh
              AND (
                  macls = p_macls
                  OR macls IN (
                      SELECT macls
                      FROM current.dmcls
                      WHERE macha = p_macls
                  )
              )
              AND COALESCE(xoa,0) = 0
        LOOP
              --Nếu có 1 cls dathu = 1 hoặc dath = 1
              IF r_cls.dathu = 1 OR r_cls.dath = 1 OR r_cls.dalappttt = 1 THEN
                  v_dathu_dathu := TRUE;
              END IF;
        END LOOP;
        IF v_dathu_dathu THEN
        	RETURN jsonb_build_object(
                        'status', 'warning',
                        'message', format('Cận lâm sàng %s: đã thực hiện hoặc đã thu tiền, không thể xóa', p_macls)
                    );
        ELSE
        	FOR r_cls IN
                SELECT mabn, maba, makb, idchidinh, iddienbien, macls, dathu, dath
                FROM current.chidinhcls
                WHERE mabn = p_mabn
                    AND maba = p_maba
                    AND makb = p_makb
                    AND iddienbien = p_iddienbien
                    AND idchidinh = p_idchidinh
                    AND (
                        macls = p_macls
                        OR macls IN (
                            SELECT macls
                            FROM current.dmcls
                            WHERE macha = p_macls
                        )
                    )
                    AND COALESCE(xoa,0) = 0
            LOOP
              UPDATE current.chidinhcls SET xoa = 1, ngayxoa = NOW()
              WHERE  mabn = r_cls.mabn
                AND maba = r_cls.maba
                AND makb = r_cls.makb
                AND iddienbien = r_cls.iddienbien
                AND idchidinh = r_cls.idchidinh
                AND macls = r_cls.macls;
            END LOOP;
        END IF;
	END IF;
	RETURN jsonb_build_object(
                'status', 'success',
                'message', format('Đã xóa CLS %s thành công', p_macls));
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;

$$ LANGUAGE plpgsql;

