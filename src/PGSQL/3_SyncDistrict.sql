-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncDistrict(mahuyen TEXT DEFAULT NULL)
-- Mô tả: Danh mục huyện
--   - Nếu mahuyen IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu mahuyen có giá trị cụ thể          => lọc theo mahuyen
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncDistrict();        -- Trả toàn bộ huyện
--   SELECT badt_dhs.GetSyncDistrict('');      -- Trả toàn bộ huyện
--   SELECT badt_dhs.GetSyncDistrict('00');   -- Chỉ huyện mã '00'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/PGr4VQKF/Postman-pq-GORxn-BEQ.png)

CREATE OR REPLACE FUNCTION badt_dhs.GetSyncDistrict(mahuyen text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mahuyen ALIAS FOR mahuyen;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
      SELECT DISTINCT ON (huyen.mahuyen)
        huyen.mahuyen AS "DistrictCode",
        huyen.tenhuyen AS "DistrictName",
        huyen.matinh AS "CityProvinceCode",
        FALSE AS "IsBlocked"
      FROM current.dmxa4750 huyen
      WHERE 
        (COALESCE(p_mahuyen, '') = '' OR huyen.mahuyen = p_mahuyen)
        AND COALESCE(huyen.mahuyen, '') <> ''
      ORDER BY huyen.mahuyen, huyen.loai DESC  -- Ưu tiên loai = 1
    -- [ÔNG TRIỆU HẬU 2025-07-24] - Xử lý lại để không trùng mahuyen
    -- SELECT DISTINCT
    --   huyen.mahuyen AS "DistrictCode",            --Mã Quận/Huyện
    --   huyen.tenhuyen AS "DistrictName",           --Quận/ Huyện
    --   huyen.matinh AS "CityProvinceCode",         --Mã Tỉnh/Thành
    --   FALSE AS "IsBlocked"                        --Khoá
    -- FROM current.dmxa4750 huyen
    -- WHERE (COALESCE(p_mahuyen,'') = '' OR huyen.mahuyen = p_mahuyen) AND COALESCE(huyen.mahuyen,'')<>''
  ) AS row_data;
  RETURN result;
END;
$$;
--SELECT badt_dhs.GetSyncDistrict();