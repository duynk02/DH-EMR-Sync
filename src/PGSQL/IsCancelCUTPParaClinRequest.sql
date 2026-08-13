-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-08-22
-- Hàm: badt_dhs.IsCancelCUTPParaClinRequest(input_json JSONB)
-- Mô tả: Hủy 1 thuốc trong toa
--   input_json: nội dung file json: thông tin bệnh nhân và toa thuốc
-- Sử dụng:
--   SELECT badt_dhs.IsCancelCUTPParaClinRequest(input_json JSONB);
--   Kiểm tra cls có đủ điều kiện xóa hay không
-- ===============================================================
/*
SELECT badt_dhs.IsCancelCUTPParaClinRequest('{
    "PresCode": "DH3.20250810.093546",
    "PatientCode": "2025019850",
    "AdmissionCode": "2506012221",
    "MedicalRecordNo": "2025007154",
    "ParaClinReqCode": "2025007154_20250810095736",
    "PCReqDltVoucherNo": "BE05"
}':: JSONB);
*/
CREATE OR REPLACE FUNCTION badt_dhs.IsCancelCUTPParaClinRequest(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
    p_mabn TEXT := input_json->>'PatientCode'; --Mã bệnh nhân
    p_maba TEXT := input_json->>'MedicalRecordNo'; -- Mã bệnh án
    p_makb TEXT := input_json->>'AdmissionCode'; -- Mã khám bệnh
    p_iddienbien TEXT := input_json->>'TPCode'; -- ID diễn biến
    p_idchidinh TEXT := input_json->>'ParaClinReqCode'; -- ID chỉ định
    p_macls TEXT := input_json->>'PCReqDltVoucherNo'; --Mã CLS

    v_exists BOOLEAN;
    v_ravien BOOLEAN;
    v_dain INT;
    v_dath INT;
    v_dathu INT;
    v_dalappttt INT;
    v_tongtien NUMERIC;
BEGIN
    -- Kiểm tra bn xuất viện
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
          AND idchidinh = p_idchidinh
          AND COALESCE(xoa, 0) = 0
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('ID chỉ định %s không tồn tại', p_idchidinh)
        );
    END IF;

    --Kiểm tra điệu kiện cận lâm sàng
    SELECT COALESCE(dain,0), COALESCE(dath,0), COALESCE(dathu,0), COALESCE(dalappttt,0)
    INTO v_dain, v_dath, v_dathu, v_dalappttt
    FROM current.chidinhcls
    WHERE mabn = p_mabn
      AND maba = p_maba
      AND makb = p_makb
      AND idchidinh = p_idchidinh
      AND macls = p_macls
      AND COALESCE(xoa,0) = 0;

    -- Kiểm tra điều kiện lỗi chi tiết
    IF v_dain != 0 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã in, không thể xóa', p_macls)
        );
    ELSIF v_dathu = 1 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã thu tiền, không thể xóa', p_macls)
        );
    ELSIF v_dath = 1 OR v_dalappttt > 0 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã thực hiện, không thể xóa', p_macls)
        );
    ELSIF v_dath = 2 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã lấy mẫu/lấy số, không thể xóa', p_macls)
        );
    ELSIF v_dath = 3 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đang thực hiện, không thể xóa', p_macls)
        );
    ELSIF v_dath >= 4 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã thực hiện, không thể xóa', p_macls)
        );
    END IF;

    --Kiểm trả CLS có kèm toa vật tư không?
     SELECT COALESCE(sum(tien),0) as tien
     INTO v_tongtien
     FROM (
           SELECT COALESCE(idchidinh,'') as id,
            CASE when loaixn = 'xbb' then thanhtien
                 when (loaixn = 'tto' or loaixn = 'ttt') and COALESCE(dain,0)= 1 then - thanhtien
                 else 0 end as tien
           FROM current.chungtu
           WHERE idchidinh = p_idchidinh
              AND mabn = p_mabn
              AND makh = p_maba
              AND macls = p_macls
              AND COALESCE(xoa,0) = 0
        ) as tam;

    IF v_tongtien > 0 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s có vật tư hoặc thuốc kèm theo, không thể xóa', p_macls)
        );
    END IF;
    -- Nếu không có lỗi
    RETURN jsonb_build_object(
        'status', 'success',
        'message', format('Cận lâm sàng %s được phép xóa', p_macls)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;