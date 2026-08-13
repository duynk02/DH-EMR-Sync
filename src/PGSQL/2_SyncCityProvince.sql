-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncCityProvince(matinh TEXT DEFAULT NULL)
-- Mô tả: Danh mục tỉnh
--   - Nếu matinh IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu matinh có giá trị cụ thể          => lọc theo matinh
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncCityProvince();        -- Trả toàn bộ tỉnh
--   SELECT badt_dhs.GetSyncCityProvince('');      -- Trả toàn bộ tỉnh
--   SELECT badt_dhs.GetSyncCityProvince('00');   -- Chỉ tỉnh mã '00'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/qYfmhScH/Postman-2-Bv-SJw-Xkic.png)

CREATE OR REPLACE FUNCTION badt_dhs.GetSyncCityProvince(matinh text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_matinh ALIAS FOR matinh;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT ON (tinh.matinh)
      tinh.matinh AS "CityProvinceCode",
      tinh.tentinh AS "CityProvinceName",
      'VN' AS "CountryCode",
      FALSE AS "IsBlocked"
    FROM current.dmxa4750 tinh
    WHERE  COALESCE(p_matinh,'') = '' OR tinh.matinh = p_matinh
    ORDER BY tinh.matinh, tinh.loai DESC  -- Ưu tiên loai = 1
    -- [ÔNG TRIỆU HẬU 2025-07-24] Xử lý lại để không bị trùng khi đưa lên EMR
    -- SELECT DISTINCT
    --   tinh.matinh AS "CityProvinceCode",          --Mã Tỉnh/Thành
    --   tinh.tentinh AS "CityProvinceName",         --Tỉnh/ Thành
    --   'VN' AS "CountryCode",  				            --Mã Quốc Gia
    --   FALSE AS "IsBlocked"                        --Khoá
    -- FROM current.dmxa4750 tinh
    -- WHERE  COALESCE(p_matinh,'') = '' OR tinh.matinh = p_matinh
  ) AS row_data;
  RETURN result;
END;
$$;
--SELECT badt_dhs.GetSyncCityProvince();