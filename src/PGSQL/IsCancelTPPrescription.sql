-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-08-22
-- Hàm: badt_dhs.IsCancelTPPrescription(input_json JSONB)
-- Mô tả: Kiểm tra chứng từ xem có được phép xóa hay khong
--   input_json: nội dung file json: thông tin bệnh nhân và toa thuốc
-- Sử dụng:
--   SELECT badt_dhs.IsCancelTPPrescription(input_json JSONB);
/*
SELECT badt_dhs.IsCancelTPPrescription('{
    "PatientCode": "2025019850",
    "MedicalRecordNo": "2025007154",
    "AdmissionCode": "2506012221",
    "PresCode": "DH3.X25.0822.075624",
    "TPCode": "DH3.20250812.081748",
    "PresDtlCode": "A597"
}':: JSONB);
*/

CREATE OR REPLACE FUNCTION badt_dhs.IsCancelTPPrescription(input_json JSONB)
RETURNS JSONB AS
$$
DECLARE
    TPCode TEXT := input_json->>'TPCode';          -- mã tờ điều trị: iddienbien
    AdmissionCode TEXT := input_json->>'AdmissionCode'; -- makb
    MedicalRecordNo TEXT := input_json->>'MedicalRecordNo'; -- maba
    PatientCode TEXT := input_json->>'PatientCode';       -- mabn
    PresCode TEXT := input_json->>'PresCode';             -- sohd

    v_dain INT;
    v_dathu INT;
    v_ttchinhtoa INT;
    v_ravien BOOLEAN;
BEGIN
    -- Kiểm tra bn xuất viện
    SELECT EXISTS (
        SELECT 1
        FROM current.bnnoitru
        WHERE mabn = PatientCode
          AND maba = MedicalRecordNo
          AND makb = AdmissionCode
          AND COALESCE(ravien, 0) > 0
    ) INTO v_ravien;

    IF  v_ravien THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Bệnh nhân %s đã xuất viện, không thể xóa toa', MedicalRecordNo)
        );
    END IF;

    -- Lấy thông tin từ bảng chungtu
    SELECT
        COALESCE(dain,0),
        COALESCE(dathu,0),
        COALESCE(ttchinhtoa,0)
    INTO v_dain, v_dathu, v_ttchinhtoa
    FROM current.chungtu
    WHERE mabn = PatientCode
      AND makh = MedicalRecordNo
      AND sohd = PresCode
      AND COALESCE(xoa,0) = 0
    LIMIT 1;

    -- Kiểm tra điều kiện lỗi chi tiết
    IF v_dain != 0 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đã in, không thể xóa', PresCode)
        );
    ELSIF v_dathu = 1 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đã thu tiền, không thể xóa', PresCode)
        );
    ELSIF v_ttchinhtoa = 1 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đang chỉnh, không thể xóa', PresCode)
        );
    ELSIF v_ttchinhtoa = 4 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đang tổng hợp, không thể xóa', PresCode)
        );
    ELSIF v_ttchinhtoa = 5 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đã tổng hợp, không thể xóa', PresCode)
        );
    END IF;

    -- Nếu không có lỗi
    RETURN jsonb_build_object(
        'status', 'success',
        'message', format('Số chứng từ %s được phép xóa', PresCode)
    );

END;
$$ LANGUAGE plpgsql;
