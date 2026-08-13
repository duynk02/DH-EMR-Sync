-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getSyncCountry(maqg TEXT DEFAULT NULL)
-- Mô tả: Danh mục quốc gia
--   - Nếu maqg IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maqg có giá trị cụ thể          => lọc theo maqg
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncCountry();        -- Trả toàn bộ quốc gia
--   SELECT badt_dhs.getSyncCountry('');      -- Trả toàn bộ quốc gia
--   SELECT badt_dhs.getSyncCountry('VN');   -- Chỉ quốc gia mã 'VN'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/ZzvVW4RP/Postman-e9-IGy7-TL47.png)
-- Gửi lỗi khi dộ dài maqg vuợt 10 ký tự [](https://i.ibb.co/8gvQgh7B/g-CZCk-Ssuu-R.png)


CREATE OR REPLACE FUNCTION badt_dhs.getSyncCountry(maqg text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_maqg ALIAS FOR maqg;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      qg.maqg AS "CountryCode",                   	-- Mã quốc gia
      qg.tenqg AS "CountryName",                 	-- Tên quốc gia
      FALSE AS "IsBlocked"	     -- Khoá
    FROM current.dmquocgia qg
    WHERE COALESCE(p_maqg,'') = '' OR qg.maqg = p_maqg
  ) AS row_data;
  RETURN result;
END;
$$;
