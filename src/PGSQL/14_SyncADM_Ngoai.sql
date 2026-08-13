-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-07-11
-- Hàm: badt_dhs.getSyncADM_Ngoai(mabn TEXT,makb TEXT)
-- Mô tả:
--   - pmabn	Mã số bệnh nhân
--   - pmakb	Mã số khám bệnh
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncADM_Ngoai(mabn,makb);  -- Trả về: thông tin nhập viện ngoại trú
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.getSyncADM_Ngoai(mabn TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mabn ALIAS FOR mabn; --alias cho biến mabn
  p_makb ALIAS FOR makb; --alias cho biến makb
  v_kb RECORD; -- Lưu cả dòng từ khambenh mới nhất
BEGIN

  -- Lấy bản ghi khambenh mới nhất
  --[ÔNG TRIỆU HẬU: 2025-08-10] Xử lý lấy mã phòng cuối cùng để gửi EMR
  SELECT kb.maphong
  INTO v_kb
  FROM current.khambenh kb
  WHERE lower(kb.mabn) = lower(p_mabn)
    AND lower(kb.makb) = lower(p_makb)
  ORDER BY kb.ngaykcb DESC
  LIMIT 1;

  SELECT row_to_json(row_data)::text
  INTO result
  FROM (
        SELECT DISTINCT
          CASE
            WHEN PS.maba IS NULL THEN 2
            WHEN PS.maba LIKE 'N%' THEN 1 --Người bệnh nội trú: 0- Nội trú, 1-Ngoại trú, 2- Khám bệnh
          END AS IsOutPatient, -- [Nguyễn Khắc Duy - 2026-04-08] Bổ sung xử lý lấy đúng loại bệnh nhân
          PS.makb AS AdmissionCode, --Mã tiếp nhận
          PS.mabn as PatientCode, --Mã bệnh nhân
          PS.maba AS MedicalRecordNo, --Số bệnh án
          PS.maba AS InpatientCode, --Mã nhập viện nội trú
          BN.ten	as FirstName, -- Tên bệnh nhân
          BN.holot as LastName, --Họ và tên lót bệnh nhân
          CASE WHEN BN.gioitinh = 0 THEN 2
               WHEN bn.gioitinh = 1 THEN 1
               ELSE 3 END as I_Gender, --Giới tính: 1-Nam, 2: Nữ, 3-Khác

          ps.tuoi as Age, --Bổ sung cột Age: tuổi
          CASE WHEN ps.dvttuoi=2 THEN 1 ELSE 0 END AS MonthAge,
          CASE WHEN ps.dvttuoi=3 THEN 1 ELSE 0 END AS DayAge,
          bn.noict AS WorkPlace, --[Ông Triệu Hậu] Bổ sung theo https://docs.google.com/document/d/1HNY0HGCnMdV4Q_gdjZFaqV4qEHl2aCr5r__B98lF8wo/edit?tab=t.0
          PS.mathe as HiCardNo, --Số BHYT [bổ sung]
          PS.ngaybd as HiValidDateFrom, --Hạn thẻ bh từ [bổ sung]
          PS.ngaykt as HiValidDateTo, --Hạn thẻ bh đến [bổ sung]
          PS.mabvdk AS HIRegistrationHospitalCode,  --[Ông Triệu Hậu] Bổ sung theo https://docs.google.com/document/d/1HNY0HGCnMdV4Q_gdjZFaqV4qEHl2aCr5r__B98lF8wo/edit?tab=t.0
          PS.tuyen HITreatmentLineType, --Cùng tuyến, trái tuyến [bổ sung] 0: cùng tuyến, 1: trái tuyến ??
          PS.ngaydk as ConfirmDate, --Ngày vào viện cũng là ngày vào khoa (khoa đầu tiên) [bổ sung]
          CASE WHEN PS.tinhtrang= 1 THEN 'Cấp cứu' ELSE 'Bình thường' END AS AdmissionStatusDesc, --Tình trạng nhập viện [bổ sung] 0: bình thường, 1: cấp cứu ??
          CASE WHEN PS.tinhtrang= 1 THEN 'Cấp cứu' ELSE 'Bình thường' END AS AdmStatusDesc,
          '' as AdmissionReason, --Lý do vào viện [bổ sung]
          '' as AdmReason, --Lý do vào viện [bổ sung]
          to_char(PS.ngaydk, 'YYYY-MM-DD HH24:MI') AS AdmissionDate, --Ngày tiếp nhận
          PS.madt AS PatientObjectCode, --Lấy theo danh mục đối tượng [ÔNG TRIỆU HẬU]
          -- PS.madv as DepartmentCode, --Mã khoa vào 
          -- PS.maphong as DepartmentCode, --Mã khoa vào [ÔNG TRIỆU HẬU: 2025-07-13]: ![](https://live.staticflickr.com/65535/54651031216_9bbefec13d_b.jpg)
          -- PS.maphong as RoomNo, --Phòng
          --[ÔNG TRIỆU HẬU: 2025-08-10] Xử lý lấy mã phòng cuối cùng để gửi EMR
          COALESCE(v_kb.maphong, PS.maphong) AS DepartmentCode,
          COALESCE(v_kb.maphong, PS.maphong) AS RoomNo,
          '' as BedNo, --Giường
          '' as AdmEmpCode, --Mã bác sĩ chỉ định nhập viện
          '' as TreatmentDoctorCode, --Mã bác sĩ điều trị
          '' as TreatmentNursingCode, --Điều dưỡng chăm sóc
          BN.ngaysinh as BirthDate, --Ngày sinh
          EXTRACT(YEAR FROM BN.ngaysinh) AS BirthYear, --Năm sinh
          TINH.ma_lienthong as BirthPlaceCode, --Mã nơi sinh (tỉnh thành)
          TINH.ma_lienthong as NativeLandCode,--Nguyên quán (tỉnh thành)
          bn.cmnd as IDCard, --Số CCCD
          to_char(bn.ngaycap, 'YYYY-MM-DD') as IDCardDate, --Ngày cấp
          bn.noicap as IDCardPlace, -- Nơi cấp
          TG.ma_medisoft as NationalityCode, --Mã quốc gia (quốc tịch)
          DT.ma_medisoft as EthnicCode, --Mã dân tộc
          BN.matg as ReligionCode, --Tôn giáo
          --ngh.ma4750 as OccupationCode, --Mã nghề nghiệp
          --[ÔNG TRIỆU HẬU: 2025-09-18] ![](https://live.staticflickr.com/65535/54795319195_59dc667efe_b.jpg)
          ngh.manghe as OccupationCode, --Mã nghề nghiệp
          bn.diachi as CurrentAddress, --Địa chỉ
          COALESCE(xa.id,'') as CAWardCode, --Phường [ÔNG TRIỆU HẬU], lấy theo current.dmxa4750, theo danh mục chung của BYT
          COALESCE(xa.mahuyen,'') as CADistrictCode, --Quận [ÔNG TRIỆU HẬU]
          COALESCE(xa.matinh,'') as CACityProvinceCode, --Tỉnh [ÔNG TRIỆU HẬU]
          COALESCE(bn.maqg,'') AS CACountryCode, --xử lý lại, lấy theo danh mục HIS, country code [ÔNG TRIỆU HẬU] ![](https://live.staticflickr.com/65535/54586935037_59fd3b3303_b.jpg)
          COALESCE(bn.email,'') as PersonalEmail, --Email
          '' as CompanyEmail, --Email
          COALESCE(bn.dienthoai,'') as TelNo, --Điện thoại bàn
          COALESCE(bn.dienthoai,'') as MobileNo, --Di động
          COALESCE(bn.cmnd,'') as PassportNumber, --Passport
          COALESCE(ps.ghichu,'') as Note,
          '' as HIAdmCode,
          '' as HIAdmDate,
	        COALESCE(ps.loaiqh,'') as I_RelationshipTypeCode, --Mối quan hệ
          COALESCE(ps.hotenqh,'') as RepFullName, -- Họ tên người thân
          COALESCE(ps.cmndqh,'') as RepIDCard, --CCCD người thân
          '' as RepIDCardDate, -- Ngày cấp CCCD người thân
          '' as RepIDCardPlace, --Nơi cấp CCCD người thân
          COALESCE(ps.diachiqh,'') as RepFullAddress, --Địa chỉ người thân
          COALESCE(ps.dienthoaiqh,'') as RepMobileNo, --Điện thoại người thân
          '' as RepEmail,
          COALESCE(BV.tenbv,'') as ReferLocation, -- Tên bệnh viện chuyển đến
          COALESCE(CV.mabv,'') as ReferHostpitalCode, --Mã bệnh viện chuyển đến
          COALESCE(PS.maicd, '') || COALESCE(';' || PS.maicdp, '') AS StrAdmICD, --ICD Chẩn đoán nhập viện (cách nhau bằng dấu phẩy) [ÔNG TRIỆU HẬU]
          COALESCE(PS.kqcdoan,'') AS AdmDiagnosis, --Chẩn đoán nhập viện [ÔNG TRIỆU HẬU] ![](https://live.staticflickr.com/65535/54586935037_59fd3b3303_b.jpg)
          '' AS BedName,
          PS.maphong AS RoomName,
          '' AS chuan_sql
        FROM current.psdangky  AS PS
        LEFT JOIN current.dmbenhnhan  AS BN ON PS.mabn = BN.mabn
        LEFT JOIN current.dmdantoc  AS DT ON BN.madt = DT.madt
        LEFT JOIN current.dmquocgia  AS TG ON BN.maqg = TG.maqg
        LEFT JOIN current.dmnghe  AS NGH ON BN.manghe = NGH.manghe
        LEFT JOIN current.dmxa4750  AS XA ON BN.maxa = XA.id
        LEFT JOIN current.dmhuyen  AS HUYEN ON XA.mahuyen = HUYEN.mahuyen
        LEFT JOIN current.dmtinh  AS TINH ON HUYEN.matinh = TINH.matinh
        LEFT JOIN current.chuyenvien  AS CV ON PS.mabn = CV.mabn AND PS.makb = CV.makb
        LEFT JOIN current.dmbenhvien  AS BV ON CV.mabv = BV.mabv
        WHERE lower(PS.mabn) = lower(p_mabn)
              AND lower(PS.makb) = lower(p_makb)
        ) AS row_data;
  RETURN result;
END;
$$;