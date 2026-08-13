-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncWard(mahuyen TEXT DEFAULT NULL)
-- Mô tả: Danh mục phuờng xã
--   - Nếu matinh IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu matinh có giá trị cụ thể          => lọc theo matinh
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncWard();        -- Trả toàn bộ tỉnh
--   SELECT badt_dhs.GetSyncWard('');      -- Trả toàn bộ tỉnh
--   SELECT badt_dhs.GetSyncWard('00');   -- Chỉ tỉnh mã '00'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/Xk280WFT/iq84-F06-Shk.png)

CREATE OR REPLACE FUNCTION badt_dhs.GetSyncWard(id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_id ALIAS FOR id;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT 
      xa.maxa AS "WardCode",           --Mã Phường/ Xã
      xa.tenxa AS "WardName",          --Phường/ Xã
      xa.mahuyen AS "DistrictCode",    --Mã Quận/Huyện
      xa.matinh AS "CityProvinceCode",    --Mã Tỉnh [ÔNG TRIỆU HẬU - 2025-07-30] ![](https://live.staticflickr.com/65535/54689198738_253f510d41_b.jpg)
      FALSE AS "IsBlocked",             --Khoá
      xa.id AS "MappingCode"            --[ÔNG TRIỆU HẬU: 2025-11-10] Thêm trường này để chuẩn hóa địa chỉ 2 cấp
                                        --https://storage.googleapis.com/calf-sure-sawfly.appspot.com/2025/11/10/DESKTOP-2FLMTI6-sidekick-2025-11-10-10h34p27.101.png
    FROM current.dmxa4750 xa
    WHERE (COALESCE(p_id,'') = '' OR xa.id = p_id) AND COALESCE(xa.id,'')<>''
  ) AS row_data;
  RETURN result;
END;
$$;
