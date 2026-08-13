-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-05-25
-- Hàm: badt_dhs.getSyncPATFR(mabn TEXT, maba TEXT, makb TEXT)
-- Mô tả:
--   - pmabn	Mã số bệnh nhân
--   - pmaba	Mã số bệnh án
--   - pmakb	Mã số khám bệnh
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncPATFR(mabn, maba, makb);  -- Trả về: thông tin nhập viện
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.getSyncPATFR(mabn TEXT, maba TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mabn ALIAS FOR mabn; --alias cho biến mabn
  p_maba ALIAS FOR maba; --alias cho biến maba
  p_makb ALIAS FOR makb; --alias cho biến makb
BEGIN
  SELECT row_to_json(row_data)::text
  INTO result
  FROM (
        SELECT DISTINCT ON (cv.mabn)
          CV.makb AS AdmissionCode, --Mã tiếp nhận
          CV.madvc AS OldDepartmentCode, --Mã khoa chuyển
          CV.madvn AS DepartmentCode, --Mã khoa chuyển
          '' AS RoomID,
          NT.buong as OldRoomID, --Phòng
          NT.sogiuong as BedID, --Giường
          to_char(CV.ngaychuyen, 'YYYY-MM-DD HH24:MI') AS TransferDate, --Ngày chuyển
          'Chuyển khoa' AS TransferNotes,
          0 AS TransferStatus,
          solan AS OrderNum, --Số lần
          ''  as PatientStatus,
          NT.kqcdoan AS Diagnosis, -- Chẩn đoán
          '' AS TransferReason, -- Lý do chuyển
          NT.manv AS TreatmentDoctorCode, --BS điều trị
          '' AS TreatmentDepartmentCode,
          --[ÔNG TRIỆU HẬU - 2025-08-19] Bổ sung thêm ![](https://live.staticflickr.com/65535/54731200250_d4b03a2276_b.jpg)
          CASE WHEN LEFT(p_maba, 1) = 'N' THEN 1 ELSE 0 END AS IsOutPatient
        FROM (
              SELECT ck.mabn, ck.maba, ck.makb,
                ngaychuyen, madvn, madvc,
                COUNT(*) OVER (PARTITION BY ck.mabn) AS solan
              FROM current.chuyenphong ck
              WHERE lower(ck.mabn) = lower(p_mabn)
                    AND lower(ck.maba) = lower(p_maba)
                    AND lower(ck.makb) = lower(p_makb)
              ORDER BY ck.mabn,ck.maba, ck.makb, ngaychuyen DESC
        ) AS cv
        INNER JOIN CURRENT.bnnoitru nt 
          ON cv.mabn = NT.mabn 
          AND CV.maba = NT.maba 
          AND CV.makb = NT.makb
  ) AS row_data;
  RETURN result;
END;
$$;