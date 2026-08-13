-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-11-05
-- Cải tiến: 2025-11-06
-- Hàm: badt_dhs.getDMGiuong(p_json JSONB)
-- Mô tả: Danh mục giường bệnh còn trống và chính bệnh nhân đó sử dụng
--
-- Sử dụng:
--   SELECT badt_dhs.getDMGiuong('{"PatientCode":"2025029956","MedicalRecordNo":"2025010963","DepartmentCode":"07"}'::jsonb);
--[ÔNG TRIỆU HẬU: 2025-11-06: 19:10] Xử lý gom gọn code và trả về theo cấu trúc đã gửi đối tác, và tầng NodeJS

CREATE OR REPLACE FUNCTION badt_dhs.getDMGiuong(p_json JSONB)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result      JSON;
  v_data        JSON;
  v_mabn        TEXT := COALESCE(p_json->>'PatientCode', '');
  v_maba        TEXT := COALESCE(p_json->>'MedicalRecordNo', '');
  v_madv        TEXT := COALESCE(p_json->>'DepartmentCode', '');
  v_nt_magiuong NUMERIC := 0;
BEGIN
  -- Lấy cấu hình hệ thống
  SELECT giatri INTO v_nt_magiuong 
  FROM current.system 
  WHERE tents = 'nt.magiuong';

  -- Kiểm tra cấu hình và lấy dữ liệu tương ứng
  IF v_nt_magiuong = 2 THEN
    -- Chỉ lấy giường trống hoặc đã ra viện
    WITH dmgiuong_all AS (
      SELECT 
        gi.ma_giuong,
        gi.diengiai,
        gi.loai,
        '' AS mabn,
        '' AS maba
      FROM current.dmgiuongbenh gi
      LEFT JOIN current.bnnoitru nt ON nt.sogiuong = gi.ma_giuong 
          AND COALESCE(nt.ravien, 0) = 0 
          AND COALESCE(nt.namvien, 0) = 1 
          AND nt.madv = v_madv
      WHERE gi.madv = v_madv
        AND COALESCE(gi.sudung, 0) = 0
        AND (
          COALESCE(gi.mabn, '') || COALESCE(nt.mabn, '') = ''
          OR
          COALESCE(gi.mabn, '') || COALESCE(gi.maba, '') = v_mabn || v_maba
          OR
          COALESCE(nt.mabn, '') || COALESCE(nt.maba, '') = v_mabn || v_maba
        )
    )
    SELECT json_agg(
      json_build_object(
        'BedNo', ma_giuong,
        'BedName', diengiai,
        'BedType', loai,
        'PatientCode', mabn,
        'MedicalRecordNo', maba
      ) ORDER BY ma_giuong
    ) INTO v_data
    FROM dmgiuong_all;

  ELSE
    -- Lấy tất cả giường
    SELECT json_agg(
      json_build_object(
        'BedNo', gi.ma_giuong,
        'BedName', gi.diengiai,
        'BedType', gi.loai,
        'PatientCode', gi.mabn,
        'MedicalRecordNo', gi.maba
      ) ORDER BY gi.ma_giuong
    ) INTO v_data
    FROM current.dmgiuongbenh gi
    WHERE gi.madv = v_madv
      AND COALESCE(gi.sudung, 0) = 0;

  END IF;

  -- Kiểm tra dữ liệu và tạo kết quả
  IF v_data IS NULL OR json_array_length(v_data) = 0 THEN
    v_result := json_build_object(
      'status', 'error',
      'message', 'Không tồn tại giường trống',
      'count', 0,
      'data', '[]'::json
    );
  ELSE
    v_result := json_build_object(
      'status', 'success',
      'message', 'Success',
      'count', json_array_length(v_data),
      'data', v_data
    );
  END IF;

  RETURN v_result;
END;
$$;

