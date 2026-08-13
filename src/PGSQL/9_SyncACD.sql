-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncACD(macv TEXT DEFAULT NULL)
-- Mô tả: Danh mục nghề nghiệp
--   - Nếu macv IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu macv có giá trị cụ thể          => lọc theo macv
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncACD();        -- Trả toàn bộ chức danh
--   SELECT badt_dhs.GetSyncACD('');      -- Trả toàn bộ chức danh
--   SELECT badt_dhs.GetSyncACD('01');   -- Chỉ chức danh mã '01'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/XrdT52Pk/1s-Vpliup-G1.png)

CREATE OR REPLACE FUNCTION badt_dhs.GetSyncACD(macv text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_macv ALIAS FOR macv;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      cv.macv AS "AcademicCode",    --Mã chức danh
      cv.tencv AS "AcademicName",   --Tên chức danh
      FALSE AS "IsBlocked"          --Khoá
    FROM current.dmchucvu cv
    WHERE p_macv IS NULL OR p_macv = '' OR cv.macv = p_macv
  ) AS row_data;
  RETURN result;
END;
$$;
