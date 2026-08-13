-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-05-27
-- Hàm: badt_dhs.getCUTPPrescription(mabn TEXT, maba TEXT, makb TEXT, sohd TEXT)
-- Mô tả:
--   - mabn	Mã số bệnh nhân
--   - maba	Mã số bệnh án
--   - makb	Mã số khám bệnh
--   - sohd	ID số hóa đơn
-- Sử dụng:
--   SELECT badt_dhs.getCUTPPrescription(mabn, maba, makb, sohd);  -- Tạo và cập nhật chỉ định thuốc
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.getCUTPPrescription(mabn text, maba text, makb text, sohd text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mabn ALIAS FOR mabn;
  p_maba ALIAS FOR maba;
  p_makb ALIAS FOR makb;
  p_sohd ALIAS FOR sohd;
BEGIN
  WITH data AS (
	SELECT ct.iddienbien as tpcode, --Mã tờ điều trị
         ct.mabn as PatientCode, --Mã bệnh nhân
         ct.makh as MedicalRecordNo, --Mã bệnh án
         nt.makb as AdmissionCode, --Mã tiếp nhận
         ct.sohd as PresCode, --Mã toa thuốc
         ct.manv as EmployeeCode, --Mã bác sĩ
  	     hd.stt as OrderNo, --số thứ tự
         0 as InventoryID, --Không thấy mô tả
         hd.mahh as InventoryCode, --Mã thuốc
         th.tenhh as InvDesc, -- tên thuốc
         CASE WHEN COALESCE(hd.sang,0) > 0 THEN 1 ELSE 0 END +
         CASE WHEN COALESCE(hd.trua,0) > 0 THEN 1 ELSE 0 END +
         CASE WHEN COALESCE(hd.chieu,0) > 0 THEN 1 ELSE 0 END +
         CASE WHEN COALESCE(hd.toi,0) > 0 THEN 1 ELSE 0 END 
          as TimePerDay, -- Lần trên ngày
         CASE WHEN COALESCE(hd.sang,0) = COALESCE(hd.trua,0) AND COALESCE(hd.sang,0) = COALESCE(hd.toi,0) AND COALESCE(hd.sang,0) = COALESCE(hd.chieu,0) THEN hd.sang ELSE 0 END as DoseQty, -- Liều dùng
         0 as DoseUOMID, --Không thấy mô tả
         th.dvt DoseUOMCode, --Mã đơn vị tính
         th.dvt DoseUOMName, --Tên đơn vị tính
         0 as MedUsageID, --Không thấy mô tả
         dd.duongdung as MedUsageCode, --Đường dùng
         hd.soluong as DispenseQty, --Không thấy mô tả, số lượng
         0 as DispenseUOMID,--Không thấy mô tả
         '' as DispenseUOMCode, --Không thấy mô tả
         COALESCE(hd.sang,0) + COALESCE(hd.trua,0) + COALESCE(hd.chieu,0) + COALESCE(hd.toi,0)  as OriDispenseQty, --Không thấy mô tả
         '' as InstructionText, --Không thấy mô tả
         ct.ghichu as PNoteDtl, --Ghi chú
         1 as DateOfUseOrderNo, --Ngày sử dụng thứ mấy của thuốc
         '' as TransferRate, --Tốc độ truyền
         '' as TransferUnitID, -- Không thấy mô tả
         '' as TransferUnitCode, --Đơn vị tốc độ
         hd.khole as  StoreHouse, --Kho lãnh
         0 as PatientObject, --Đối tượng
         CASE WHEN COALESCE(hd.sang,0) > 0 THEN true ELSE false END as IsMorning, --Buổi snags
         CASE WHEN COALESCE(hd.trua,0) > 0 THEN true ELSE false END as IsMidday, --Buổi trưa
         CASE WHEN COALESCE(hd.chieu,0) > 0 THEN true ELSE false END as IsAfternoon, --Buổi chiều
         CASE WHEN COALESCE(hd.toi,0) > 0 THEN true ELSE false END as IsEvening, --Buổi tối
         '' as MorningTime, --Giờ uống thuốc buổi sáng
         '' as MiddayTime,--Giờ uống thuốc buổi trưa
         '' as AfternoonTime,--Giờ uống thuốc buổi chiều
         '' as EveningTime,--Giờ uống thuốc buổi tối
         hd.sang as MorningQty,--Liều dùng buổi sáng
         hd.trua as MiddayQty,--Liều dùng buổi trưa
         hd.chieu as AfternoonQty,--Liều dùng buổi chiều
         hd.toi as EveningQty,--Liều dùng buổi tối
         COALESCE(ct.ngayuong,0) as DateOfUse, --Số ngày sử dụng [ÔNG TRIỆU HẬU - 20250809]: Xử lý COALESCE để tránh lỗi
         ct.ngayhd as FromDate, --Từ ngày
         ct.ngayhd + CASE WHEN COALESCE(ct.ngayuong,0) <= 1 THEN 0 ELSE COALESCE(ct.ngayuong,0) END * INTERVAL '1 day' as ToDate,--Đến ngày
         'WM' as PType, --Loại thuốc: OM-Thuốc thang, WM-Thuốc tây y, EM-Thuốc đôngty, OUT-Mua ngoài
         '' as Hospital, --Tên bệnh viện
         COALESCE(hd.xoa,0) AS xoa, --Bổ sung cột xóa để lấy làm mã chính khi thao tác với EMR
         COALESCE(hd.solo,'') AS solo,
         COALESCE(hd.handung,'') AS handung,
         COALESCE(hd.giavat,0) AS giavat,
         REGEXP_REPLACE(hd.mahh||COALESCE(hd.solo,'')||COALESCE(hd.handung,'')||TO_CHAR(hd.giavat, 'FM9999999999990.######'), '[^a-zA-Z0-9]+', '', 'g') AS PresDtlCode,
         '' AS chuan_sql --Bổ sung để lúc nào dòng này cũng ở cuối, tránh lỗi cú pháp sql, thiếu dấu
  FROM current.chungtu ct
    INNER JOIN current.pshdxn hd ON ct.sohd = hd.sohd AND ct.makh = hd.makh AND ct.mabn = hd.mabn --[ÔNG TRIỆU HẬU]: Bổ sung điều kiện để tránh trường hợp trùng số hd
                                AND COALESCE(hd.xoa,0) = COALESCE(ct.xoa,0)
  	LEFT JOIN current.bnnoitru nt ON ct.mabn = nt.mabn  
          --[ÔNG TRIỆU HẬU - 2027-07-28: Xử lý để dùng đối với BANT]
          --[ÔNG TRIỆU HẬU - 2027-07-30: Xử lý để dùng đối với BANT theo đợt và ngày]
          AND (
                (lower(ct.makh) = lower(nt.maba) AND COALESCE(ct.noitru,0) = 1 ) --Nội trú
                OR 
                (lower(ct.makh) = lower(nt.maba) AND COALESCE(ct.noitru,0) = 0 AND COALESCE(ct.bant,0) = 0 ) --BANT đợt
                OR 
                (lower(ct.makh) = lower(nt.makb) AND COALESCE(ct.noitru,0) = 0 AND COALESCE(ct.bant,0) = 1 ) --BANT ngày
                OR 
          		  (lower(ct.makh) = lower(p_makb) AND COALESCE(ct.noitru,0) = 0 AND COALESCE(ct.bant,0) = 0 AND COALESCE(ct.maba,'')='' ) --Ngoại trú - khám bệnh
              )
    LEFT JOIN current.dmthuoc th ON hd.mahh = th.mahh
    LEFT JOIN current.dmduongdung dd ON th.madd = dd.madd
  WHERE lower(ct.mabn) = lower(p_mabn) 
    AND lower(ct.sohd) = lower(p_sohd)
    AND COALESCE(ct.xoa,0) = 0
    AND COALESCE(hd.xoa,0) = 0
    --[ÔNG TRIỆU HẬU - 2027-07-28: Xử lý để dùng đối với BANT]
    --[ÔNG TRIỆU HẬU - 2027-07-30: Xử lý để dùng đối với BANT theo đợt và ngày]
    AND (
          (lower(ct.makh) = lower(p_maba) AND COALESCE(ct.noitru,0) = 1 ) --Nội trú
          OR 
          (lower(ct.makh) = lower(p_maba) AND COALESCE(ct.noitru,0) = 0 AND COALESCE(ct.bant,0) = 0 ) --BANT đợt
          OR 
          (lower(ct.makh) = lower(p_makb) AND COALESCE(ct.noitru,0) = 0 AND COALESCE(ct.bant,0) = 1 ) --BANT ngày
          OR 
          (lower(ct.makh) = lower(p_makb) AND COALESCE(ct.noitru,0) = 0 AND COALESCE(ct.bant,0) = 0 AND COALESCE(ct.maba,'')='' ) --Ngoại trú - khám bệnh
        )
  )
  SELECT json_build_object(
    'tpcode', tpcode, --Mã tờ điều trị
    'AdmissionCode', AdmissionCode, --Mã tiếp nhận
    'MedicalRecordNo', MedicalRecordNo,--Mã bệnh án
    'PatientCode', PatientCode, --Mã bệnh nhân
    'EmployeeCode', EmployeeCode, --Mã số bác sĩ
    'PresCode', PresCode,  --PresCode,--Mã toa thuốc => [ÔNG TRIỆU HẬU] Do EMR 1 tờ điều trị chỉ có một chứng từ thuốc, 
                                           -- nên phải dùng TPCode chỗ này, Và truyền số chứng từ này vào chi tiết 
                                           -- cộng với mã hàng hóa, khi xóa thì phải xóa chi tiết từng mặt hàng theo chứng từ
                                           -- ![](https://live.staticflickr.com/65535/54609890512_3355c32cc9_b.jpg)
                                           -- 2025-06-28: Chuyển về số HD theo https://docs.google.com/document/d/1HNY0HGCnMdV4Q_gdjZFaqV4qEHl2aCr5r__B98lF8wo/edit?tab=t.0#heading=h.kbfnrnqivgou
                                           -- ![](https://live.staticflickr.com/65535/54619198014_515bd45738_b.jpg)
    'Prescriptions', json_agg(
                 json_build_object(
                 'OrderNo', OrderNo, --số thứ tự
                 'PresDtlCode', PresDtlCode, --=> [ÔNG TRIỆU HẬU]--Bổ sung chi tiết để xử lý, giá trị lấy sohd||mahh
                                                                             --Bổ sung thêm cột xóa làm mã chính trên EMR, 
                                                                             --trường hợp chỉnh chứng từ, HIS giữ lại số chứng từ cũ, nên không làm mã chính để thao tác với EMR được.
                 'InventoryID', InventoryID, --Không thấy mô tả
                 'InventoryCode', InventoryCode, --Mã thuốc
                 'InvDesc', InvDesc, -- tên thuốc
                 'TimePerDay', TimePerDay, -- Lần trên ngày
                 'DoseQty', DoseQty, -- Liều dùng
                 'DoseUOMID', DoseUOMID, --Không thấy mô tả
                 'DoseUOMCode', DoseUOMCode, --Mã đơn vị tính
                 'DoseUOMName', DoseUOMName, --Tên đơn vị tính
                 'MedUsageID', MedUsageID, --Không thấy mô tả
                 'MedUsageCode', MedUsageCode, --Đường dùng
                 'DispenseQty', DispenseQty, --Không thấy mô tả
                 'DispenseUOMID', DispenseUOMID,--Không thấy mô tả
                 'DispenseUOMCode', DispenseUOMCode, --Không thấy mô tả
                 'OriDispenseQty', OriDispenseQty, --Không thấy mô tả
                 'InstructionText', InstructionText, --Không thấy mô tả
                 'PNoteDtl', PNoteDtl, --Ghi chú
                 'DateOfUseOrderNo', DateOfUseOrderNo, --Ngày sử dụng thứ mấy của thuốc
                 'TransferRate', TransferRate, --Tốc độ truyền
                 'TransferUnitID', TransferUnitID, -- Không thấy mô tả
                 'TransferUnitCode', TransferUnitCode, --Đơn vị tốc độ
                 'StoreHouse', StoreHouse, --Kho lãnh
                 'PatientObject', PatientObject, --Đối tượng
                 'IsMorning', IsMorning, --Buổi snags
                 'IsMidday', IsMidday, --Buổi trưa
                 'IsAfternoon', IsAfternoon, --Buổi chiều
                 'IsEvening', IsEvening, --Buổi tối
                 'MorningTime', MorningTime, --Giờ uống thuốc buổi sáng
                 'MiddayTime', MiddayTime,--Giờ uống thuốc buổi trưa
                 'AfternoonTime', AfternoonTime,--Giờ uống thuốc buổi chiều
                 'EveningTime', EveningTime,--Giờ uống thuốc buổi tối
                 'MorningQty', MorningQty,--Liều dùng buổi sáng
                 'MiddayQty', MiddayQty,--Liều dùng buổi trưa
                 'AfternoonQty', AfternoonQty,--Liều dùng buổi chiều
                 'EveningQty', EveningQty,--Liều dùng buổi tối
                 'DateOfUse', DateOfUse, --Số ngày sử dụng
                 'FromDate', FromDate, --Từ ngày
                 'ToDate', ToDate,--Đến ngày
                 'PType', PType, --Loại thuốc: OM-Thuốc thang, WM-Thuốc tây y, EM-Thuốc đôngty, OUT-Mua ngoài
                 'Hospital', Hospital --Tên bệnh viện
      )
      ORDER BY OrderNo
    )
  ) INTO result
  FROM data
  GROUP BY tpcode, AdmissionCode, MedicalRecordNo, PatientCode, EmployeeCode, PresCode;

  RETURN result;
END;
$$;
