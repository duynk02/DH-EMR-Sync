-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncInvType(madv TEXT DEFAULT NULL)
-- Mô tả: Danh mục loại thuốc
--   - Nếu khoql IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu khoql có giá trị cụ thể          => lọc theo khoql
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncInvType();        -- Trả toàn bộ loại thuốc
--   SELECT badt_dhs.GetSyncInvType('');      -- Trả toàn bộ loại thuốc
--   SELECT badt_dhs.GetSyncInvType('01');   -- Chỉ loại thuốc mã '01'
-- ===============================================================
-- Mô tả pdf maphong = RoomCode | Json mẫu maphong = RoomNo ==> gửi thành công theo Json mẫu
-- [](https://i.ibb.co/0xm10z8/Postman-1-Uq-BHMAXnm.png)


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncInvType(khoql text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_khoql ALIAS FOR khoql;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
     	ql.khoql AS "InvTypeCode",
        ql.diengiai AS "InvTypeName",
        CASE WHEN ql.kho = '06' THEN 'OM' WHEN ql.kho = '07' THEN 'EM' ELSE 'WM' END AS "PType",
        FALSE AS "IsBlocked"
    FROM current.dmkhoql ql
    WHERE p_khoql IS NULL OR p_khoql = '' OR ql.khoql = p_khoql
  ) AS row_data;
  RETURN result;
END;
$$;