-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-05-25
-- Hàm: badt_dhs.getSyncDCHG(mabn TEXT, maba TEXT, makb TEXT)
-- Mô tả:
--   - pmabn	Mã số bệnh nhân
--   - pmaba	Mã số bệnh án
--   - pmakb	Mã số khám bệnh
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncDCHG(mabn, maba, makb);  -- Trả về: thông tin nhập viện
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.getSyncDCHG(mabn TEXT, maba TEXT, makb TEXT)
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
		SELECT DISTINCT
          NT.makb AS AdmissionCode, --Mã tiếp nhận
          to_char(NT.ngayrv, 'YYYY-MM-DD HH24:MI') AS DischargedDate, --Ngày ra viện
          (NT.ngayrv::date - NT.ngayvv::date + 1) as TreatmentDays, --Số ngày điều trị
          NT.maicd || ',' || NT.maicdp as DiagnosisICD01s, --Mã chẩn đoán ra viện
          NT.kqcdoan || ',' || NT.kqcdoanp as DiagnosisICD01Names, --Tên chẩn đoán ra viện
          CASE WHEN COALESCE(NT.bienchung,0) = 1 THEN true ELSE false END as IsComplication, -- Biến chứng
          false as IsInfection, --Nhiễm trùng
          (SELECT EXISTS ( SELECT 1 FROM current.phauthuat pt  INNER JOIN current.dmcls ls ON pt.macls = ls.macls  WHERE pt.mabn = p_mabn  AND pt.maba = p_maba  AND pt.makb = p_makb  AND ls.maloai IN ('TT', 'PT'))) as IsSurgery, --Phẫu thuật
          COALESCE(kq.ma_medisoft,'') as TreatmentResultID, -- Kết quả điều trị
          COALESCE(xt.ma_medisoft,'') as DischargeTypeID, -- Loại xuất viện
          CV.lydo as TransferReasonType, --Lý do chuyển viện
          CV.mabv as TransferHospitalCode, --Bệnh viện chuyển
          '' as TransferNote, --Ghi chú chuyển
          pp.diengiai as TreatmentMethod, --Phương thức điều trị
          to_char(CV.ngaycv, 'YYYY-MM-DD HH24:MI') AS TransferDate, --Thời gian chuyển
          CV.phuongtien as TransferMethod, --Phương tiện chuyển
          cv.manvc as EscortEmployeeCodes, --Mã số nhân viên hộ tống
          cv.tinhtrang as PatientStatus, --Trạng thái người bệnh
          nt.so as DeathNo, -- Vào sổ số (tử vong)
          nt.nguyennhantv as DeathReasonType, --Nguyên nhân tử vong
          nt.ghichu as Note, --Ghi chú
          CASE WHEN COALESCE(nt.khamnghiemtt,0) = 1 THEN true ELSE false END as IsAutopsy, --Khám nghiệm tử thi
          nt.maicdgp as AutopsyICDs, --Mã chẩn đoán khám nghiệm tử thi
          nt.kqcdoangp as AutopsyICDNames --Tên chẩn đoán khám nghiệm tử thi
        FROM current.bnnoitru  AS NT
          LEFT JOIN current.chuyenvien CV ON (NT.mabn = CV.mabn and NT.makb = CV.makb and NT.maba = CV.maba)
          LEFT JOIN current.dmketqua kq ON NT.makq = kq.makq
          LEFT JOIN current.dmxutri xt ON NT.maxt = xt.maxt
          LEFT JOIN current.dmppdt pp ON NT.mappdt = pp.mappdt
        WHERE lower(NT.mabn) = lower(p_mabn)
                AND lower(NT.maba) = lower(p_maba)
                AND lower(NT.makb) = lower(p_makb)
                AND COALESCE(CV.xoa,0) = 0
                AND COALESCE(NT.ravien,0) > 0
  ) AS row_data;
  RETURN result;
END;
$$;