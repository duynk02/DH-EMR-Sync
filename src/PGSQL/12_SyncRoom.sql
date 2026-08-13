-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncRoom(madv TEXT DEFAULT NULL)
-- Mô tả: Danh mục phòng
--   - Nếu maphong IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maphong có giá trị cụ thể          => lọc theo maphong
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncRoom();        -- Trả toàn bộ phòng
--   SELECT badt_dhs.GetSyncRoom('');      -- Trả toàn bộ phòng
--   SELECT badt_dhs.GetSyncRoom('10');   -- Chỉ khoa mã '10'
-- ===============================================================
-- Mô tả pdf maphong = RoomCode | Json mẫu maphong = RoomNo ==> gửi thành công theo Json mẫu
-- [](https://i.ibb.co/0xm10z8/Postman-1-Uq-BHMAXnm.png)


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncRoom(maphong text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_maphong ALIAS FOR maphong;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
     ph.maphong AS "RoomNo",                --Mã phòng
     ph.tenphong AS "RoomName",             --Tên phòng
     ph.madv AS "DepartmentCode",           --Mã Khoa phòng
     CASE WHEN ph.xoa = 0 THEN FALSE ELSE TRUE END AS "IsBlocked",  --Khoá
     CASE WHEN COALESCE(ph.khoakb,0) = 1 THEN 'PK' ELSE 'R00' END AS "RoomType" --Loại phòng : R01 - Phòng 1 giường; R02 - Phòng 2 giường; R03 - Phòng 3 giường; R04 - Phòng 4 giường; R05 - Phòng 5 giường; 
                                                                                --R06 - Phòng 6 giường; R07 - Phòng 7 giường; R08 - Phòng 8 giường; R09 - Phòng 9 giường; R10 - Phòng 10 giường; R00 - Khác;
                                                                                --BB - Buồng bệnh; PM - Phòng mổ; PK - Phòng khám
    FROM current.dmphong ph
    WHERE p_maphong IS NULL OR p_maphong = '' OR ph.maphong = p_maphong
  ) AS row_data;
  RETURN result;
END;
$$;
