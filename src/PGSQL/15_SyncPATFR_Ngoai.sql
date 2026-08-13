-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-07-11
-- Hàm: badt_dhs.getSyncPATFR_Ngoai(mabn TEXT, makb TEXT)
-- Mô tả:
--   - pmabn	Mã số bệnh nhân
--   - pmakb	Mã số khám bệnh
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncPATFR_Ngoai(mabn, makb);  -- Trả về: thông tin chuyển phòng ngại trú
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.getSyncPATFR_Ngoai(mabn TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mabn ALIAS FOR mabn; --alias cho biến mabn
  p_makb ALIAS FOR makb; --alias cho biến makb
BEGIN
  SELECT row_to_json(row_data)::text
  INTO result
  FROM (
		SELECT DISTINCT ON (cv.mabn)
            CV.makb AS AdmissionCode, --Mã tiếp nhận
            CV.madvc AS OldDepartmentCode, --Mã khoa chuyển
            CV.madvn AS DepartmentCode, --Mã khoa chuyển
            CV.mapn AS RoomID,
            CV.mapc as OldRoomID, --Phòng
            '' as BedID, --Giường
            to_char(CV.ngaychuyen, 'YYYY-MM-DD HH24:MI') AS TransferDate, --Ngày chuyển
            'Chuyển khoa' AS TransferNotes,
            0 AS TransferStatus,
            solan AS OrderNum, --Số lần
            ''  as PatientStatus,
            PS.kqcdoan AS Diagnosis, -- Chẩn đoán
            '' AS TransferReason, -- Lý do chuyển
            KB.manv AS TreatmentDoctorCode, --BS điều trị
            '' AS TreatmentDepartmentCode,
            --[ÔNG TRIỆU HẬU - 2025-08-19] Bổ sung thêm ![](https://live.staticflickr.com/65535/54731200250_d4b03a2276_b.jpg)
            2 AS IsOutPatient
          FROM (
                SELECT ck.mabn, ck.maba, ck.makb,
                  ngaychuyen, madvn, madvc, ck.mapc, ck.mapn,
                  COUNT(*) OVER (PARTITION BY ck.mabn) AS solan
                FROM current.chuyenphong ck
                WHERE lower(ck.mabn) = lower(p_mabn)
                      AND lower(ck.makb) = lower(p_makb)
                ORDER BY ck.mabn,ck.maba, ck.makb, ngaychuyen DESC
              ) AS cv
          INNER JOIN CURRENT.psdangky PS ON cv.mabn = PS.mabn AND CV.makb = PS.makb
          INNER JOIN CURRENT.khambenh KB ON cv.mabn = KB.mabn AND CV.makb = KB.makb AND cv.madvc = KB.madv
  ) AS row_data;
  RETURN result;
END;
$$;