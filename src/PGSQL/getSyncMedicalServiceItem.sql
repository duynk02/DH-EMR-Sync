-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getSyncMedicalServiceItem(macls TEXT DEFAULT NULL)
-- Mô tả: Danh mục CLS
--   - Nếu macls IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu macls có giá trị cụ thể          => lọc theo maloai
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncMedicalServiceItem();        -- Trả toàn bộ CLS
--   SELECT badt_dhs.getSyncMedicalServiceItem('');      -- Trả toàn bộ CLS
--   SELECT badt_dhs.getSyncMedicalServiceItem('XN');   -- Chỉ loại CLS mã 'XN'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/TMMk33ZZ/e-MJQT7-Va1o.png)



CREATE OR REPLACE FUNCTION badt_dhs.getSyncMedicalServiceItem(macls text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_macls ALIAS FOR macls;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      cls.macls AS "MedSerCode",                  																-- Mã dịch vụ
      CASE WHEN cls.kho IN ('MU','PT','TT','XN','OX','HA','CN') THEN cls.maloai ELSE cls.maloai END AS "MSTypeCode",   	-- Mã loại
      cls.tencls AS "MedSerName",																				-- Tên dịch vụ
      CASE WHEN (cls.sudung = 1 AND COALESCE(tt37,0)=1) THEN FALSE ELSE TRUE END AS "IsBlocked", -- Khoá
      COALESCE(cls.thuchien, 0) AS "IsResultRequired", --[Nguyễn Khắc Duy: 2026-03-31] Bổ sung trường IsResultRequired để xác định cls có yêu cầu trả kết quả trước khi chỉ định mới
                                --[ÔNG TRIỆU HẬU: 2025-08-09] Nếu tt37 khác 1 thì Khóa lại
      COALESCE(cls.bhyt,0) AS "IsHI", --[ÔNG TRIỆU HẬU - 2025-07-09] EMR có yêu cầu bổ sung IsHI để nhận diện đối tượng Dịch vụ, 
                                   --https://docs.google.com/spreadsheets/d/1guIZ-cWoBRHd_9Kmv0G2gK82LvGR_VZEed0s6VybRq4/edit?gid=0#gid=0
      COALESCE(cls.tt37,0) AS TT37 --[ÔNG TRIỆU HẬU: 2025-08-09] Thêm dấu hiệu để biết TT37
    FROM current.dmcls cls 
    WHERE
     p_macls IS NULL OR p_macls = '' OR cls.macls = p_macls
  ) AS row_data;
  RETURN result;
END;
$$;
