-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getSyncICD(maicd TEXT DEFAULT NULL)
-- Mô tả: Danh mục ICD
--   - Nếu maicd IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maicd có giá trị cụ thể          => lọc theo maicd
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncICD();        -- Trả toàn bộ ICD
--   SELECT badt_dhs.getSyncICD('');      -- Trả toàn bộ ICD
--   SELECT badt_dhs.getSyncICD('A01');   -- Chỉ ICD mã A01
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/Q3KhWxrk/xpt-JOfhugv.png)

CREATE OR REPLACE FUNCTION badt_dhs.getSyncICD(maicd text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_maicd ALIAS FOR maicd;
BEGIN
  -- emrData: {
  --   "ICDCode":"A08.2", // Mã ICD
  --   "ICDName": "Viêm ruột do Adenovirus", //Tên
  --   "ParentCode":"A08", // Mã cha - Không có thì để trống
  --   "IsTraditional": false, // ICD Y học cổ truyền
  --   "IsBlocked": true
  -- }
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      icd.maicd AS "ICDCode",               -- Mã bệnh
      icd.tenviet AS "ICDName",             -- Tên bệnh
      '' AS "ParentCode",                   -- Mã bệnh Cha
      FALSE AS "IsTraditional",     		    -- ICD YHCT, False - Hiện đại True - Y học cổ truyền
      CASE WHEN COALESCE(icd.xoa,0) = 0 THEN FALSE ELSE TRUE END AS "IsBlocked",          -- Khóa, False: mở - True: Khóa
      CASE WHEN COALESCE(icd.xoa,0) = 0 THEN TRUE ELSE FALSE END AS "Active"          -- Khóa, False: mở - True: Khóa
    FROM current.dmicd icd
    WHERE ( COALESCE(p_maicd,'') = ''       --[ÔNG TRIỆU HẬU: 2025-09-11]
            OR 
            icd.maicd = p_maicd
          )
    ORDER BY icd.maicd
  ) AS row_data;
  RETURN result;
END;
$$;