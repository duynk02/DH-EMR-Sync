-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncBed(ma_giuong TEXT DEFAULT NULL)
-- Mô tả: Danh mục giuờng bệnh
--   - Nếu ma_giuong IS NULL hoặc rỗng ('')     => trả toàn bộ giuờng theo madv
--   - Nếu ma_giuong có giá trị cụ thể          => lọc theo ma_giuong theo madv
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncBed(); 			-- Trả toàn bộ giuờng
--   SELECT badt_dhs.GetSyncBed(''); 		-- Trả toàn bộ giuờng
--   SELECT badt_dhs.GetSyncBed('H001'); 	-- Trả giuờng H001
-- ===============================================================


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncBed(ma_giuong text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_ma_giuong ALIAS FOR ma_giuong;
  BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    --[ÔNG TRIỆU HÂU - 2025-07-31] Xử lý để tránh trùng magiuong và madv khi đồng bộ dữ liệu
    SELECT DISTINCT ON (gi.ma_giuong, COALESCE(gi.madv, ''))
       gi.ma_giuong AS "BedNo",        -- Mã giường
       gi.diengiai AS "BedName",       -- Tên giường
       'G' AS "BedType",               -- Loại giường: G - Giường
       COALESCE(gi.madv, '') AS "RoomNo",  -- Mã phòng (khoa)
       CASE WHEN COALESCE(gi.sudung, 0) = 0 THEN FALSE ELSE TRUE END AS "IsBlocked"  -- Khoá
    FROM current.dmgiuongbenh gi
    WHERE p_ma_giuong IS NULL OR p_ma_giuong = '' OR gi.ma_giuong = p_ma_giuong
    ORDER BY gi.ma_giuong, COALESCE(gi.madv, '')
  ) AS row_data;
  RETURN result;
END;
$$;
--   SELECT badt_dhs.GetSyncBed();