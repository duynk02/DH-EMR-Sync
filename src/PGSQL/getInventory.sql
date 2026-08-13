-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-06-17
-- Hàm: badt_dhs.getInventory(mahh TEXT DEFAULT NULL, khocp TEXT, thangkt TEXT, namkt TEXT)
-- Mô tả:
--   - Nếu mahh IS NULL hoặc rỗng ('')     => lấy toàn bộ dữ liệu, theo thangt, namkt
--
-- Sử dụng:
--   SELECT badt_dhs.getInventory('','02','05','2025');        -- Lấy toàn bộ tồn kho theo kho cấp phát 02 tháng 05/2025
--   SELECT badt_dhs.getInventory('A02','02','05','2025');     -- Lấy tồn kho, mahh='A02', theo khocp 02 tháng 05/2025

-- ===============================================================

CREATE OR REPLACE FUNCTION badt_dhs.getInventory(mahh TEXT, khocp TEXT, thangkt TEXT, namkt TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mahh ALIAS FOR mahh;
  p_khocp ALIAS FOR khocp;
  p_thangkt ALIAS FOR thangkt;
  p_namkt ALIAS FOR namkt;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
        SELECT tk.mahh as InvCode, --mahh
         th.tenhh as InvName, --tenhh 
         th.tenhc as ActiveIngredient, --Hoạc chất
         th.hamluong as DrugContent, -- Hàm lượng
         th.dvt as UOMCode, --dvt, 
         tk.giavat as PriceVAT, --giá vat, 
         tk.giaxuat as Price, -- giá xuất, 
         tk.giabhyt as PriceHI, --giá bh  , 
         tk.handung as expDate, --Hạn dùng 
         tk.visa, 
         tk.solo as lotNumber, -- Số lô 
         tk.toncuoi as Stock, --tồn kho (tồn cuối) 
         k.bhyt as IsHI, --thanh bh: 0 không thanh, 1: thanh 
         tk.khocp as StoreHouseCode, --mã khoa (khocp)
         tk.madv as CabinetCode, --Mã tủ trực (madv)
         tk.thangkt as sMonth, --Tháng kết toán 
         tk.namkt as sYear --Năm kế toán
        FROM current.pstonkho tk
            INNER JOIN current.dmthuoc th ON tk.mahh = th.mahh
            INNER JOIN current.dmkho k ON tk.mahh = k.mahh
        WHERE (p_mahh IS NULL OR p_mahh = '' OR tk.mahh = p_mahh)
              AND tk.khocp = p_khocp
              AND tk.thangkt = p_thangkt
              AND tk.namkt = p_namkt
              AND COALESCE(tk.uutien,'') != '2'
              AND COALESCE(tk.toncuoi,0) > 0
        ORDER BY tk.mahh, tk.handung, tk.uutien
  ) AS row_data;
  RETURN result;
END;
$$;
