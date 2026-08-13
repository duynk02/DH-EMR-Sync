-- ===============================================================
-- Thực hiện: ÔNG TRIỆU HẬU- 2025-07-26
-- Hàm: badt_dhs.getSyncDCHG_Ngoai_Khambenh(mabn TEXT, makb TEXT)
-- Mô tả:
--   - pmabn	Mã số bệnh nhân
--   - pmakb	Mã số khám bệnh
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncDCHG_Ngoai_Khambenh(mabn, makb);  -- Trả về: thông tin kết thúc khám
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.getSyncDCHG_Ngoai_Khambenh(mabn TEXT, makb TEXT)
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
		SELECT DISTINCT
          CASE WHEN COALESCE(dk.maba,'')='' THEN dk.makb ELSE '' END AS AdmissionCode, --Mã tiếp nhận
          TO_CHAR(
                  CASE WHEN dk.ngayinphieu IS NOT NULL THEN dk.ngayinphieu
                       ELSE (date(dk.ngaydk) + interval '23 hours 59 minutes') 
                  END, 'YYYY-MM-DD HH24:MI'
                ) AS DischargedDate, --Ngày ra viện
          1 AS TreatmentDays, --Số ngày điều trị
          CASE 
            WHEN TRIM(BOTH ';' FROM (COALESCE(dk.maicd, '') || ';' || COALESCE(dk.maicdp, ''))) = '' 
            THEN (SELECT TRIM(BOTH ';' FROM (COALESCE(kb.maicd, '') || ';' || COALESCE(kb.maicdp, ''))) FROM current.khambenh AS kb WHERE kb.mabn=p_mabn AND kb.makb=p_makb ORDER BY kb.ngaykcb DESC LIMIT 1)  -- Lấy giá trị trong khambenh, cuối cùng
            ELSE TRIM(BOTH ';' FROM (COALESCE(dk.maicd, '') || ';' || COALESCE(dk.maicdp, '')))  -- Trả về giá trị khi dk.maicd có giá trị
          END AS DiagnosisICD01s, --Mã chẩn đoán ra viện
          CASE 
            WHEN COALESCE(dk.kqcdoan, '') = '' 
            THEN (SELECT TRIM(BOTH ';' FROM (COALESCE(kb.kqcdoan, '') || ';' || COALESCE(kb.kqcdoanp, ''))) FROM current.khambenh AS kb WHERE kb.mabn=p_mabn AND kb.makb=p_makb ORDER BY kb.ngaykcb DESC LIMIT 1)  -- Lấy giá trị trong khambenh, cuối cùng
            ELSE COALESCE(dk.kqcdoan, '')  -- Trả về giá trị khi dk.maicd có giá trị
          END  AS DiagnosisICD01Names, --Tên chẩn đoán ra viện
          FALSE AS IsComplication, -- Biến chứng
          FALSE AS IsInfection, --Nhiễm trùng
          (SELECT EXISTS ( SELECT 1 FROM current.phauthuat AS pt  INNER JOIN current.dmcls AS ls ON pt.macls = ls.macls  WHERE pt.mabn = p_mabn  AND COALESCE(pt.maba,'') = ''  AND pt.makb = p_makb  AND ls.maloai IN ('TT', 'PT'))) AS IsSurgery, --Phẫu thuật
          1 AS TreatmentResultID, -- Kết quả điều trị
          1 AS DischargeTypeID, -- Loại xuất viện
          cv.lydo AS TransferReasonType, --Lý do chuyển viện
          cv.mabv AS TransferHospitalCode, --Bệnh viện chuyển
          '' AS TransferNote, --Ghi chú chuyển
          '' as TreatmentMethod, --Phương thức điều trị
          TO_CHAR(cv.ngaycv, 'YYYY-MM-DD HH24:MI') AS TransferDate, --Thời gian chuyển
          cv.phuongtien AS TransferMethod, --Phương tiện chuyển
          cv.manvc AS EscortEmployeeCodes, --Mã số nhân viên hộ tống
          cv.tinhtrang AS PatientStatus, --Trạng thái người bệnh
          '' AS DeathNo, -- Vào sổ số (tử vong)
          '' AS DeathReasonType, --Nguyên nhân tử vong
          '' AS Note, --Ghi chú
          FALSE AS IsAutopsy, --Khám nghiệm tử thi
          '' AS AutopsyICDs, --Mã chẩn đoán khám nghiệm tử thi
          '' AS AutopsyICDNames --Tên chẩn đoán khám nghiệm tử thi
        FROM current.psdangky  AS dk
          LEFT JOIN current.chuyenvien AS cv ON (dk.mabn = cv.mabn and dk.makb = cv.makb and COALESCE(cv.maba,'')='')
        WHERE lower(dk.mabn) = lower(p_mabn)
              AND lower(dk.makb) = lower(p_makb)
  ) AS row_data;
  RETURN result;
END;
$$;

--Use: SELECT badt_dhs.getSyncDCHG_Ngoai_Khambenh('mabn', 'makb');