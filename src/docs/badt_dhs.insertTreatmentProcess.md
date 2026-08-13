# Hướng dẫn luồng dữ liệu hàm `badt_dhs.insertTreatmentProcess`

## Mục đích

Hàm này xử lý việc thêm/cập nhật thông tin quá trình điều trị bệnh nhân nội trú từ hệ thống DHS (Digital Health System), bao gồm thuốc và cận lâm sàng (CLS).

## Luồng xử lý chính

### 1. Khởi tạo và trích xuất dữ liệu

- **Input**: JSON chứa thông tin quá trình điều trị
- **Trích xuất**: Các thông tin cơ bản như TPCode, PatientCode, AdmissionCode, MedicalRecordNo, TreatmentDoctorCode
- **Khởi tạo**: Các biến để xử lý chẩn đoán, dấu hiệu sinh tồn, thuốc, CLS

### 2. Kiểm tra điều kiện tiên quyết (Validation)

#### 2.1 Kiểm tra trạng thái bệnh nhân

```sql
-- Kiểm tra bệnh nhân còn đang điều trị (chưa ra viện)
SELECT 1 FROM current.bnnoitru
WHERE mabn = PatientCode AND makb = AdmissionCode AND maba = MedicalRecordNo
AND COALESCE(ravien,0) = 0
```

**→ Nếu không tồn tại**: Trả về lỗi "không tồn tại trong HIS"

#### 2.2 Kiểm tra bác sĩ điều trị

```sql
-- Kiểm tra bác sĩ có chứng chỉ hành nghề và đang làm việc
SELECT 1 FROM current.dmnhanvien
WHERE manv = TreatmentDoctorCode
AND COALESCE(macc_hanhnghe_cv2348,'') != ''
AND COALESCE(trangthai,'') = '1'
```

**→ Nếu không hợp lệ**: Trả về lỗi "không tồn tại hoặc không đủ điều kiện"

#### 2.3 Kiểm tra mã ICD chẩn đoán hiện đại (DiagnosisType = 1)

```sql
-- Kiểm tra tất cả ICD code trong chẩn đoán hiện đại
LEFT JOIN current.dmicd m ON m.maicd = dx.icd_code AND COALESCE(m.xoa,0)=0
```

**→ Nếu có ICD không tồn tại**: Trả về danh sách ICD lỗi

#### 2.4 Kiểm tra mã ICD YHCT (DiagnosisType = 2)

```sql
-- Kiểm tra ICD Y học cổ truyền
LEFT JOIN current.dmbyt_benhyhct m ON m.ma_yhct = dx.icd_code
```

**→ Nếu có ICD YHCT không tồn tại**: Trả về danh sách ICD lỗi

#### 2.5 Kiểm tra mã CLS

```sql
-- Kiểm tra các dịch vụ cận lâm sàng
LEFT JOIN current.dmcls m ON m.macls = dx.macls_code
AND COALESCE(m.sudung,0)=1 AND COALESCE(m.tt37,0)=1
```

**→ Nếu có mã CLS không hợp lệ**: Trả về danh sách mã lỗi

### 3. Xử lý dữ liệu chẩn đoán

#### 3.1 Phân loại chẩn đoán

- **DiagnosisType = 2 (YHCT)**:

  - Lấy `dt_mayhct` và `dt_tenyhct`
  - Ưu tiên `DiagnosisDesc`, nếu không có thì lấy `DiagnosisICDName`

- **DiagnosisType = 1 (Hiện đại)**:
  - **IsMain = true**: Chẩn đoán chính → `dt_maicd`, `dt_kqcdoan`
  - **IsMain = false**: Chẩn đoán phụ → thêm vào mảng `dt_maicdp_arr`, `dt_kqcdoanp_arr`

#### 3.2 Gom chẩn đoán phụ

```sql
dt_maicdp   := array_to_string(dt_maicdp_arr, ';');
dt_kqcdoanp := array_to_string(dt_kqcdoanp_arr, ';');
```

### 4. Kiểm tra cấu trúc bảng

Kiểm tra sự tồn tại của cột `api` trong các bảng:

- `qtdieutri.api`
- `chungtu.api`
- `chidinhcls.api`

**→ Nếu thiếu cột**: Trả về lỗi cấu trúc bảng

### 5. Lấy thông tin bổ trợ

#### 5.1 Thông tin kế toán

```sql
SELECT giatri FROM current.system WHERE tents = 'thanglv'
-- Tách thành thangkt_S và namkt_S
```

#### 5.2 Thông tin nội trú

```sql
SELECT maphong, sogiuong FROM current.bnnoitru
WHERE mabn = PatientCode AND maba = MedicalRecordNo AND makb = AdmissionCode
```

#### 5.3 Xử lý huyết áp

```sql
nt_huyetap := BloodPressureSystolic || '/' || BloodPressureDiastolic
```

### 6. Thực hiện lưu dữ liệu

#### 6.1 Bảng `current.qtdieutri` (Quá trình điều trị)

**Kiểm tra tồn tại**:

```sql
SELECT EXISTS (SELECT 1 FROM current.qtdieutri WHERE iddienbien = TPCode)
```

**Nếu đã tồn tại** → **UPDATE**:

- manv, ngaygio, dienbien
- maicd, kqcdoan, maicdp, kqcdoanp
- madv, mayhct, tenyhct, chamsoc
- maphong, sogiuong
- api = 1

**Nếu chưa tồn tại** → **INSERT**:

- Tất cả thông tin trên + thangkt, namkt

#### 6.2 Bảng `current.bnnoitru` (Bệnh nhân nội trú)

**Luôn UPDATE** thông tin:

- Thông tin điều trị: manv, iddienbien, ngaykcb, dienbien
- Chẩn đoán: maicd, kqcdoan, maicdp, kqcdoanp, madv, mayhct, tenyhct
- Chăm sóc: chamsoc
- Dấu hiệu sinh tồn: huyetap, nhiptho, nhietdo, mach, chieucao, cannang
- Phòng giường: maphong, sogiuong

#### 6.3 Bảng `current.ttcon` (Thẻ thứ 2)

**UPDATE** cho bệnh nhân con (loaitt = 1):

- manv, iddienbien
- maicd, kqcdoan, maicdp, kqcdoanp
- mayhct, tenyhct

### 7. Xử lý thuốc và CLS

#### 7.1 Xử lý đơn thuốc

```sql
IF jsonb_array_length(COALESCE(input_json->'Prescriptions', '[]'::jsonb)) > 0 THEN
    PERFORM badt_dhs.inserttpprescription(input_json);
END IF;
```

#### 7.2 Xử lý cận lâm sàng

```sql
IF jsonb_array_length(COALESCE(input_json->'ParaClinRequests', '[]'::jsonb)) > 0 THEN
    PERFORM badt_dhs.insertcutpparaclinrequest(input_json);
END IF;
```

## Kết quả trả về

### Thành công

```json
{
  "status": "success",
  "message": ""
}
```

### Lỗi

```json
{
  "status": "error",
  "message": "Chi tiết lỗi cụ thể"
}
```

## Các trường hợp lỗi chính

1. **Bệnh nhân đã ra viện** → Không cho phép cập nhật
2. **Bác sĩ không hợp lệ** → Không có chứng chỉ hành nghề hoặc ngưng làm việc
3. **ICD không tồn tại** → Mã chẩn đoán không có trong danh mục
4. **CLS không hợp lệ** → Dịch vụ ngưng sử dụng hoặc không được phép
5. **Thiếu cấu trúc bảng** → Chưa có cột `api`
6. **Lỗi database** → Các lỗi SQL khác

## Đặc điểm quan trọng

- **Transaction safety**: Sử dụng BEGIN/EXCEPTION để đảm bảo tính toàn vẹn dữ liệu
- **API tracking**: Đánh dấu `api = 1` cho các bản ghi từ hệ thống ngoài
- **Flexible diagnosis**: Hỗ trợ cả chẩn đoán hiện đại và Y học cổ truyền
- **Comprehensive validation**: Kiểm tra đầy đủ các điều kiện trước khi lưu
- **Modular design**: Gọi các hàm con để xử lý thuốc và CLS riêng biệt
