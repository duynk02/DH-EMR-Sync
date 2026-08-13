-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncStoreHouse(khocp TEXT DEFAULT NULL)
-- Mô tả: Danh mục kho
--   - Nếu khocp IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu khocp có giá trị cụ thể          => lọc theo khocp
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncStoreHouse();        -- Trả toàn bộ kho
--   SELECT badt_dhs.GetSyncStoreHouse('');      -- Trả toàn bộ kho
--   SELECT badt_dhs.GetSyncStoreHouse('14');    -- Chỉ kho mã '01'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/CsVb9h8P/kcx-Am-Mxvdr.png)

CREATE OR REPLACE FUNCTION badt_dhs.GetSyncStoreHouse(khocp text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_khocp ALIAS FOR khocp;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      kho.khocp AS "StoreHouseCode",                                            --Mã kho 
      kho.diengiai AS "StoreHouseName",                                         --Tên kho 
      CASE WHEN kho.loai = 1 THEN 1 ELSE 2 END AS "StoreHouseKind",             --Loại kho : 1- Kho chẵn; 2 - Kho lẻ; 3 - Tủ trực
      CASE WHEN kho.noitru != 1 THEN 1 ELSE 0 END AS "IsOutPatient",            --Kho ngoại trú: 0 - Nội trú; 1 - Kho ngoại trú
      CASE WHEN kho.khoaduoc = 1 THEN TRUE ELSE FALSE END AS "IsHI",            --Bảo hiểm : True - Bảo hiểm; False - Không bảo hiểm
      kho.khocpc AS "DepartmentCode",                                           --Mã Khoa/ Phòng
      CASE WHEN COALESCE(dv.xoa,0) = 0 THEN FALSE ELSE TRUE END AS "IsBlocked"  --Khoá
    FROM current.dmkhocp kho
    LEFT JOIN current.dmdonvi dv ON dv.madv = kho.khocp
    WHERE p_khocp IS NULL OR p_khocp = '' OR kho.khocp = p_khocp
  ) AS row_data;
  RETURN result;
END;
$$;
