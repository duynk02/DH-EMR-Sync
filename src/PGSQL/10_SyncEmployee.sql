-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncEmployee(manv TEXT DEFAULT NULL)
-- Mô tả: Danh mục phòng
--   - Nếu manv IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu manv có giá trị cụ thể          => lọc theo manv
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncEmployee();        -- Trả toàn bộ nhân viên
--   SELECT badt_dhs.GetSyncEmployee('');      -- Trả toàn bộ nhân viên
--   SELECT badt_dhs.GetSyncEmployee('00');   -- Chỉ nhân viên mã '00'
-- ===============================================================
-- Mô tả không có truờng AcademicCode ==> khi gửi bắt buộc phải có
-- Gửi thành công [](https://i.ibb.co/ks1CGbBQ/Postman-4-Nrltoc-L2v.png)

CREATE OR REPLACE FUNCTION badt_dhs.GetSyncEmployee(manv text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_manv ALIAS FOR manv;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
     nv.manv AS "EmployeeCode",                  --Mã nhân viên 
     nv.holot ||' '|| nv.ten AS "EmployeeName",  --Tên nhân viên 
     nv.macv AS "AcademicCode",                       --Mã chức danh
     nv.ngaysinh::date AS "BirthDate",            --Ngày sinh 
     CASE WHEN nv.gioitinh = 1 THEN 1 WHEN nv.gioitinh = 0 THEN 2 ELSE 3 END  AS "Sex",    --Giới tính
     NULLIF(nv.mobile,'') AS "MobileNo",      --Điện thoại di động
     NULLIF(nv.dienthoair,'') AS "TelNo",     --Điện thoại bàn
     NULLIF(nv.email,'') AS "Email",          --Email
     nv.madv AS "DepartmentCode",             --Phòng ban
     CASE WHEN nv.trangthai = '1' THEN TRUE ELSE FALSE END AS "Active",  --Sử dụng 
    COALESCE(nv.macc_hanhnghe_cv2348,'') AS "CoPCode" --[ÔNG TRIỆU HẬU: 2025-09-11] ![](https://live.staticflickr.com/65535/54780118920_070cf01e59_b.jpg)
    FROM current.dmnhanvien nv
    WHERE p_manv IS NULL OR p_manv = '' OR nv.manv = p_manv
  ) AS row_data;
  RETURN result;
END;
$$;
