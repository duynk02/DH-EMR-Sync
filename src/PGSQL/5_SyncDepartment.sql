-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncDepartment(madv TEXT DEFAULT NULL)
-- Mô tả: Danh mục khoa
--   - Nếu madv IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu madv có giá trị cụ thể          => lọc theo madv
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncDepartment();        -- Trả toàn bộ khoa
--   SELECT badt_dhs.GetSyncDepartment('');      -- Trả toàn bộ khoa
--   SELECT badt_dhs.GetSyncDepartment('10');   -- Chỉ khoa mã '10'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/KjC5D19D/Postman-PU6-Cx-Wm0-F8.png)

CREATE OR REPLACE FUNCTION badt_dhs.GetSyncDepartment(madv text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_madv ALIAS FOR madv;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      '' AS "ParentDepartmentCode",							--Mã cha
      COALESCE(dv.madv,'') AS "DepartmentCode",								--Mã phòng khoa 
      COALESCE(dv.tendv,'') AS "DepartmentName",								--Tên phòng khoa
      COALESCE(dv.vietngan,'') AS "DepartmentShortName",							--Tên viết tắt 
      '' AS "Description",									--Diễn giải
      '' AS "Note",										--Ghi chú
      CASE  WHEN COALESCE(dv.khoaduoc,0) = 3 THEN 'OEXM'
	          WHEN COALESCE(dv.khoaduoc,0) = 4 THEN 'INUN'
            WHEN COALESCE(dv.khoaduoc,0) = 5 THEN 'PACL' ELSE 'FUDE' END AS "DepartmentType", 	--Loại phòng khoa : OEXM -Khám bệnh ngoại trú; INUN - Nội trú; PACL - Cận lâm sàng; FUDE -Phòng chức năng
      '' AS "MHDepartmentCode",									--Mã phòng khoa của bộ y tế 
      COALESCE(dv.ma_khoa_cv2348, '') AS "MHSpecialCode",					--Mã chuyên khoa của bộ y tế
      --[ÔNG TRIỆU HẬU - 2025-08-22]: Chỉnh lại Active theo trạng thái sử dụng (xoa)
      CASE WHEN COALESCE(dv.xoa,0) = 0 THEN TRUE ELSE FALSE END AS "Active" 		--Sử dụng 
    FROM current.dmdonvi dv
    WHERE dv.loaidv = 1 AND 
      (p_madv IS NULL OR p_madv = '' OR dv.madv = p_madv) 
  ) AS row_data;
  RETURN result;
END;
$$;
