# 🔗 KẾT NỐI DỮ LIỆU TỪ POSTGRESQL SANG API BỆNH ÁN ĐIỆN TỬ DHS

## 🧩 Mô hình thực hiện

Hệ thống được thiết kế theo mô hình tách biệt:

- **PostgreSQL**: _Chịu trách nhiệm chuẩn hóa dữ liệu và trả về JSON thông qua các hàm (`FUNCTION`)_
- **Node.js**: _Giao tiếp với PostgreSQL, lấy dữ liệu và gửi sang các hệ thống API theo cấu hình_
- **Mục đích**: _Xử lý đồng bộ với chiều ngược lại (đổ dữ liệu EMR vào HIS), dễ dàng thay đổi khi cần, có thể kết hợp với các đối tác khác theo các chức năng tách biệt, không ảnh hưởng tới hệ thống hiện tại quá nhiều._

## Qui tắc lấy dữ liệu trong PostgreSQL

1. Tạo các hàm trong schema `badt_dhs`
2. Gọi hàm trả về dữ liệu tương ứng
3. Các hàm cần có thể lấy chi tiết hoặc toàn bộ. Danh mục thì có para cột mã, nếu hông có thì lấy toàn bộ danh mục, ngược lại thì lấy toàn bộ.
4. Các hàm liên quan tới thông tin bệnh nhân, quá trình điều trị, thuốc, cận lâm sàng sẽ có các thông tin kèm theo truyền vào. Ví dụ: muốn lấy thông tin điều trị của một bệnh nhân thì phải có mabn,makb,maba,id điều trị, hoặc toa thuốc thì có số chứng từ...., tuân thủ qui tắc thuốc hoặc cận lâm sàng phải có id điều trị.
5. Qui tắc tạo các tên các para phải bám sát vào các cột trong dữ liệu theo các bảng hiện có. Tên hàm đặt theo qui tắt `get{path cuối cùng trong request}` ví dụ `server/his-server/api/SyncData/SyncICD` thì `getSyncICD`
6. Có comment, diễn giải các para, ghi lại các nội dung, ghi chú theo tài liệu, có ghi nhận người thực hiện và ngày thực hiện.
7. Các hàm phải đảm bảo qui tắc đọc nội dung file sẽ chạy được và không lỗi.
8. Ví dụ mẫu:

```
-- ===============================================================
-- Thực hiện: ÔNG TRIỆU HẬU - 2025-05-22
-- Hàm: badt_dhs.getSyncICD(maicd TEXT DEFAULT NULL)
-- Mô tả:
--   - Nếu maicd IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maicd có giá trị cụ thể          => lọc theo maicd
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncICD();        -- Trả toàn bộ ICD
--   SELECT badt_dhs.getSyncICD('');      -- Trả toàn bộ ICD
--   SELECT badt_dhs.getSyncICD('A01');   -- Chỉ ICD mã A01
-- ===============================================================

CREATE OR REPLACE FUNCTION badt_dhs.getSyncICD(maicd text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      maicd AS "ICDCode",                   -- Mã bệnh
      tenviet AS "ICDName",                 -- Tên bệnh
      NULL::text AS "ParentCode",           -- Mã bệnh Cha
      NULL::boolean AS "IsTraditional",     -- ICD YHCT, False - Hiện đại True - Y học cổ truyền
      NULL::boolean AS "IsBlocked"          -- Khóa, False:mở - True: Khóa
    FROM current.dmicd
    WHERE maicd IS NOT DISTINCT FROM NULLIF(maicd, '') OR current.dmicd.maicd = maicd
  ) AS row_data;
  RETURN result;
END;
$$;
```

## Qui tắc kết nối - Gửi dữ liệu - Viết bằng nodeJS

1. Dựa vào postman để viết hàm chung gửi dữ liệu, thông tin data và các path sẽ thay đổi truyền vào hàm gửi dữ liệu này.
2. Đối tác có sử dụng `Token` và thời hạn của `Token` là 24h, xử lý lưu token và có kiểm tra hết hạn thì lấy lại. Không được xử lý mỗi lần gửi dữ liệu phải gọi lấy `Token`
3. Các tham số kết nối đối tác sẽ cấu hình trong `.env`

# Danh sách các request trong collection "DHS - SYNC DATA"

1. SyncCountry - Quốc gia
2. SyncCityProvince - Tỉnh/Thành
3. SyncDistrict - Quận/Huyện
4. SyncWard - Phường/Xã
5. SyncDepartment - Đồng bộ Khoa Phòng
6. SyncEthnic - Dân tộc
7. SyncICD - ICD10
8. SyncOccupation - Nghề nghiệp
9. SyncACD - Chức danh
10. SyncEmployee - Đồng bộ nhân viên
11. SyncStoreHouse - Kho
12. SyncRoom - Đồng bộ Phòng
13. SyncBed - Đồng bộ Giường
14. SyncADM - Thông tin nhập viện
15. SyncPATFR - Chuyển khoa
16. SyncDCHG - Xuất viện

# Danh sách tên các request trong collection "DHS - Tờ Điều Trị"

1. GetTreatmentProcess - Xem thông tin điều trị
2. CUTreatmentProcess - Tạo và cập nhật tờ điều trị
3. DTreatmentProcess - Xoá tờ điều trị
4. SignTreatmentProcess - Ký số tờ điều trị
5. CUTPPrescription - Tạo và cập nhật chỉ định thuốc
6. DTPPrescription - Xoá chỉ định thuốc
7. CUTPParaClinRequest - Tạo và cập nhật chỉ định CLS
8. DTPParaClinRequest - Xoá chỉ định CLS
