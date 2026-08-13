-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getSyncMedSerType(maloai TEXT DEFAULT NULL)
-- Mô tả: Danh mục loại CLS
--   - Nếu maloai IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maloai có giá trị cụ thể          => lọc theo maloai
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncMedSerType();        -- Trả toàn bộ loại CLS
--   SELECT badt_dhs.getSyncMedSerType('');      -- Trả toàn bộ loại CLS
--   SELECT badt_dhs.getSyncMedSerType('XN');   -- Chỉ loại CLS mã 'XN'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/LDzhJGgx/LUt-Z5-CLm-QR.png)



CREATE OR REPLACE FUNCTION badt_dhs.getSyncMedSerType(maloai text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_maloai ALIAS FOR maloai;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      NULL AS "PMSTypeCode",						--Mã Cha
      loai.maloai AS "MSTypeCode",                  -- Mã loại
      loai.tenloai AS "MSTypeName",                 	-- Tên loại
      FALSE AS "IsBlocked",	     					-- Khoá
      CASE  WHEN loai.kho = 'MU' THEN 'MAU'
      		  WHEN loai.kho IN ('PT','TT')  THEN 'PTTT'
            WHEN loai.kho = 'XN' THEN 'XN'
            WHEN loai.kho = 'OX' THEN 'OXY'
            WHEN loai.kho = 'HA' THEN 'CDHA'
            WHEN loai.kho = 'CN' THEN 'TDCN'
			      ELSE '' END AS "V_ServiceKind" 			--Nhóm :
                                                    --MAU - Máu
            										--PTTT - Phẫu thuật/ thủ thuật
                                                    --XN - Xét nghiệm
                                                    --OXY - Ô xy
                                                    --CDHA - Chẩn đoán hình ảnh
                                                    --VLTL - Vật lý trị liệu
                                                    --CCUU - Châm cứu
                                                    --HC - Hội chẩn
                                                    --TDCN - Thăm dò chắc năng
    FROM current.dmloaicls loai
    WHERE
    --loai.kho NOT IN ('KB','CV','CV2','DV','GB','SO')
     p_maloai IS NULL OR p_maloai = '' OR loai.maloai = p_maloai
  ) AS row_data;
  RETURN result;
END;
$$;
