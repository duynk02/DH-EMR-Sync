-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncEthnic(madt TEXT DEFAULT NULL)
-- Mô tả: Danh mục dân tộc
--   - Nếu madt IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu madt có giá trị cụ thể          => lọc theo dmdantoc.ma4750
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncEthnic();        -- Trả toàn bộ dân tộc
--   SELECT badt_dhs.GetSyncEthnic('');      -- Trả toàn bộ dân tộc
--   SELECT badt_dhs.GetSyncEthnic('00');   -- Chỉ dân tộc mã '00'
-- ===============================================================
-- Gửi lỗi khi EthnicCode = dmdantoc.madt [](https://i.ibb.co/NgqHCBxq/Postman-YV3-Oh-LTu-L5.png)
-- Gửi thành công khi EthnicCode = dmdantoc.ma4750 [](https://i.ibb.co/GQK4MF3k/i-Orsnr-Lo-W0.png)

DROP FUNCTION IF EXISTS badt_dhs.GetSyncEthnic(text);
CREATE OR REPLACE FUNCTION badt_dhs.GetSyncEthnic(ma_medisoft text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_ma_medisoft ALIAS FOR ma_medisoft;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT ON (dt.ma_medisoft)
      dt.ma_medisoft AS "EthnicCode",    --Mã dân tộc 
      dt.tendt AS "EthnicName",     --Tên dân tộc
      dt.tendt AS "EthnicDesc",     --Mô tả
      FALSE AS "IsBlocked"	     		--Khoá
    FROM current.dmdantoc AS dt
    WHERE (COALESCE(p_ma_medisoft,'') = '' OR dt.ma_medisoft = p_ma_medisoft) AND COALESCE(dt.ma_medisoft,'')<>''
    ORDER BY dt.ma_medisoft, dt.tendt DESC
  ) AS row_data;
  RETURN result;
END;
$$;
