-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncOccupation(mann TEXT DEFAULT NULL)
-- Mô tả: Danh mục nghề nghiệp
--   - Nếu mann IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu mann có giá trị cụ thể          => lọc theo dmnghe.ma4750
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncOccupation();        -- Trả toàn bộ nghề nghiệp
--   SELECT badt_dhs.GetSyncOccupation('');      -- Trả toàn bộ nghề nghiệp
--   SELECT badt_dhs.GetSyncOccupation('00');   -- Chỉ nghề nghiệp mã '00'
-- ===============================================================
-- Gửi lỗi khi OccupationCode = dmnghe.manghe [](https://i.ibb.co/zTxJk4Ny/Postman-G7q5yg24x0.png)
-- Gửi thành công khi OccupationCode = dmnghe.ma4750 [](https://i.ibb.co/VWnGs0ns/Postman-ICBN86-I9u5.png)

CREATE OR REPLACE FUNCTION badt_dhs.GetSyncOccupation(mann text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mann ALIAS FOR mann;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT ON (nghe.manghe)
      nghe.manghe AS "OccupationCode", --[ÔNG TRIỆU HẬU: 2025-09-11]
                                       --Mã nghề nghiệp 
                                       --![](https://live.staticflickr.com/65535/54780018144_7cec49da6d_b.jpg)
      nghe.ma4750 AS "OccupationCode4750",    --Mã nghề nghiệp 
      nghe.tennghe AS "OccupationName",   --Nghề nghiệp
      nghe.tennghe AS "OccupationDesc",   --Mô tả
      FALSE AS "IsBlocked"	     		--Khoá
    FROM current.dmnghe AS nghe
    WHERE (COALESCE(p_mann,'') = '' OR nghe.ma4750 = p_mann) AND COALESCE(nghe.ma4750,'')<>''
    ORDER BY nghe.manghe, nghe.tennghe DESC
  ) AS row_data;
  RETURN result;
END;
$$;
