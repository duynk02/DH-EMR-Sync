-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncInventory(madv TEXT DEFAULT NULL)
-- Mô tả: Danh mục thuốc
--   - Nếu mahh IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu mahh có giá trị cụ thể          => lọc theo mahh
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncInventory();        -- Trả toàn bộ thuốc
--   SELECT badt_dhs.GetSyncInventory('');      -- Trả toàn bộ thuốc
--   SELECT badt_dhs.GetSyncInventory('01');   -- Chỉ thuốc mã '01'
-- ===============================================================



CREATE OR REPLACE FUNCTION badt_dhs.GetSyncInventory(mahh text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mahh ALIAS FOR mahh;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
  	SELECT
        --[ÔNG TRIỆU HẬU - 2025-08-21]: Xử lý COALESCE để không null khi gửi lên EMR, ![](https://live.staticflickr.com/65535/54735119381_9861374faa_b.jpg)
    	  COALESCE(th.mahh,'') AS "InvCode",
        COALESCE(th.khoql,'') AS "InvTypeCode",
    	  COALESCE(th.tenhh,'') AS "InvName",
        COALESCE(th.dvt,'') AS "UOMCode",
        COALESCE(th.dvt,'') AS "DoseUOMCode",
        COALESCE(th.tenhc,'') AS "ActiveIngredient",
        COALESCE(th.hamluong,'') AS "DrugContent",
        COALESCE(th.madd,'') AS "MedUsageCode",
        COALESCE(th.nuocsx,'') AS "NationCode",
        COALESCE(th.quicachdg,'') AS "ModelPacking",
        COALESCE(th.ghichu, '') AS "InvNotes", --[Nguyễn Khắc Duy - 2026-03-31] bổ sung field InvNotes theo yêu cầu
        CASE WHEN COALESCE(th.xoa,0) = 1 THEN TRUE ELSE FALSE END AS "IsBlocked",
        COALESCE(kho.bhyt,0) AS "IsHI" --[ÔNG TRIỆU HẬU - 2025-08-01] Bổ sung thêm theo yêu cầu
    FROM current.dmthuoc th
    LEFT JOIN current.dmkho AS kho ON kho.mahh = th.mahh
    WHERE p_mahh IS NULL OR p_mahh = '' OR th.mahh = p_mahh
  ) AS row_data;
  RETURN result;
END;
$$;