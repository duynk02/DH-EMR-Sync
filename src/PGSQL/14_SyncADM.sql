-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-05-25
-- Hàm: badt_dhs.getSyncADM(mabn TEXT, maba TEXT, makb TEXT)
-- Mô tả:
--	 - Người thực hiện: ntvuong
--   - pmabn	Mã số bệnh nhân
--   - pmaba	Mã số bệnh án
--   - pmakb	Mã số khám bệnh
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncADM(mabn, maba, makb);  -- Trả về: thông tin nhập viện
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.getSyncADM(mabn TEXT, maba TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mabn ALIAS FOR mabn; --alias cho biến mabn
  p_maba ALIAS FOR maba; --alias cho biến maba
  p_makb ALIAS FOR makb; --alias cho biến makb

  pgRow RECORD; --Sử dụng record để kiểm tra 
BEGIN
  
  SELECT row_to_json(row_data)::text
  INTO result
  FROM (   

    SELECT DISTINCT
    (CASE WHEN NT.namvien=0 THEN 1 ELSE 0 END) AS IsOutPatient, --Người bệnh nội trú: 0- Nội trú, 1-Ngoại trú, 2- Khám bệnh
                                                                --[ÔNG TRIỆU HẬU - 2025-07-12] Xử lý để gửi bệnh án ngoại trú
    NT.makb AS AdmissionCode, --Mã tiếp nhận
    NT.mabn as PatientCode, --Mã bệnh nhân
    NT.maba AS MedicalRecordNo, --Số bệnh án
    NT.maba AS InpatientCode, --Mã nhập viện nội trú
    BN.ten	as FirstName, -- Tên bệnh nhân
    BN.holot as LastName, --Họ và tên lót bệnh nhân
    CASE WHEN BN.gioitinh = 0 THEN 2
         WHEN bn.gioitinh = 1 THEN 1
         ELSE 3 END as I_Gender, --Giới tính: 1-Nam, 2: Nữ, 3-Khác
	
    ps.tuoi as Age, --Bổ sung cột Age: tuổi
    CASE WHEN ps.dvttuoi=2 THEN 1 ELSE 0 END AS MonthAge,
    CASE WHEN ps.dvttuoi=3 THEN 1 ELSE 0 END AS DayAge,
    bn.noict AS WorkPlace, --[Ông Triệu Hậu] Bổ sung theo https://docs.google.com/document/d/1HNY0HGCnMdV4Q_gdjZFaqV4qEHl2aCr5r__B98lF8wo/edit?tab=t.0
    NT.mathe as HiCardNo, --Số BHYT [bổ sung]
    NT.ngaybd as HiValidDateFrom, --Hạn thẻ bh từ [bổ sung]
    NT.ngaykt as HiValidDateTo, --Hạn thẻ bh đến [bổ sung]
    NT.mabvdk AS HIRegistrationHospitalCode,  --[Ông Triệu Hậu] Bổ sung theo https://docs.google.com/document/d/1HNY0HGCnMdV4Q_gdjZFaqV4qEHl2aCr5r__B98lF8wo/edit?tab=t.0
    NT.tuyen HITreatmentLineType, --Cùng tuyến, trái tuyến [bổ sung] 0: cùng tuyến, 1: trái tuyến ??
    PS.ngaydk as ConfirmDate, -- Bổ sung field này thay cho DeparmentDate để ghi nhận ngày đăng ký khám bệnh
    CASE WHEN NT.tinhtrangvv='1' THEN 'Cấp cứu' ELSE 'Bình thường' END AS AdmissionStatusDesc, --Tình trạng nhập viện [bổ sung] 0: bình thường, 1: cấp cứu ??
    CASE WHEN NT.tinhtrangvv='1' THEN 'Cấp cứu' ELSE 'Bình thường' END AS AdmStatusDesc, 
    NT.lydovv as AdmissionReason, --Lý do vào viện [bổ sung]
    NT.lydovv as AdmReason, --Lý do vào viện [bổ sung]
    to_char(NT.ngayvv, 'YYYY-MM-DD HH24:MI') AS AdmissionDate, -- Ghi nhận ngày giờ nhập viện
    NT.madt AS PatientObjectCode, --Lấy theo danh mục đối tượng [ÔNG TRIỆU HẬU]
    (CASE WHEN NT.namvien=0 THEN NT.maphong ELSE NT.madv END)  as DepartmentCode, --Mã khoa vào [Nguyễn Khắc Duy - 2026-04-06]: Xử lý lấy maphong mới nhất làm DepartmentCode đối với BANT ![](https://live.staticflickr.com/65535/54675323294_01d49a7796_b.jpg)
    COALESCE(NULLIF(NT.maphong, ''), NT.buong) as RoomNo, --Phòng
    COALESCE(NT.sogiuong,'') as BedNo, --Giường
    COALESCE(NT.manvvv,'') as AdmEmpCode, --Mã bác sĩ chỉ định nhập viện
    COALESCE(NT.manv,'') as TreatmentDoctorCode, --Mã bác sĩ điều trị
    '' as TreatmentNursingCode, --Điều dưỡng chăm sóc
    BN.ngaysinh as BirthDate, --Ngày sinh
    EXTRACT(YEAR FROM BN.ngaysinh) AS BirthYear, --Năm sinh
    COALESCE(TINH.ma_lienthong,'') as BirthPlaceCode, --Mã nơi sinh (tỉnh thành)
    COALESCE(TINH.ma_lienthong,'') as NativeLandCode,--Nguyên quán (tỉnh thành)
    COALESCE(bn.cmnd,'') as IDCard, --Số CCCD
    to_char(bn.ngaycap, 'YYYY-MM-DD') as IDCardDate, --Ngày cấp
    COALESCE(bn.noicap,'') as IDCardPlace, -- Nơi cấp
    COALESCE(TG.ma_medisoft,'') as NationalityCode, --Mã quốc gia (quốc tịch)
    COALESCE(DT.ma_medisoft,'') as EthnicCode, --Mã dân tộc
    COALESCE(BN.matg,'') as ReligionCode, --Tôn giáo
    --ngh.ma4750 as OccupationCode, --Mã nghề nghiệp
    --[ÔNG TRIỆU HẬU: 2025-09-18] ![](https://live.staticflickr.com/65535/54795319195_59dc667efe_b.jpg)
    COALESCE(ngh.manghe,'') as OccupationCode, --Mã nghề nghiệp
    COALESCE(bn.diachi,'') as CurrentAddress, --Địa chỉ
    COALESCE(xa.id,'') as CAWardCode, --Phường [ÔNG TRIỆU HẬU], lấy theo current.dmxa4750, theo danh mục chung của BYT
                                      --[ÔNG TRIỆU HẬU: 2025-11-12] Xử lấy id gửi vào CAWardCode
    COALESCE(xa.mahuyen,'') as CADistrictCode, --Quận [ÔNG TRIỆU HẬU]
    COALESCE(xa.matinh,'') as CACityProvinceCode, --Tỉnh [ÔNG TRIỆU HẬU]
    --bn.ngoaikieu as CACountryCode, --Ngoại kiều
    COALESCE(bn.maqg,'') AS CACountryCode, --xử lý lại, lấy theo danh mục HIS, country code [ÔNG TRIỆU HẬU] ![](https://live.staticflickr.com/65535/54586935037_59fd3b3303_b.jpg)
    COALESCE(bn.email,'') as PersonalEmail, --Email
    '' as CompanyEmail, --Email
    COALESCE(bn.dienthoai,'') as TelNo, --Điện thoại bàn
    COALESCE(bn.dienthoai,'') as MobileNo, --Di động
    COALESCE(bn.cmnd,'') as PassportNumber, --Passport
    COALESCE(nt.ghichu,'') as Note,
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
    json_build_object(
      'ExecutorCode',          COALESCE(NT.manvvv,''),
      'BloodPressureSystolic', CASE WHEN position('/' in COALESCE(KB.huyetap, '')) > 0
                                    THEN COALESCE(NULLIF(substring(split_part(COALESCE(KB.huyetap, ''), '/', 1) from '^[0-9]+'), '')::numeric, 0)
                                ELSE 0 END,
      'BloodPressureDiastolic', CASE WHEN position('/' in COALESCE(KB.huyetap, '')) > 0
                                      THEN COALESCE(NULLIF(substring(split_part(COALESCE(KB.huyetap, ''), '/', 2) from '^[0-9]+'), '')::numeric, 0)
                                ELSE 0 END,
      'BreathBeat', COALESCE(KB.nhiptho, 0),
      'BodyTemperature', COALESCE(KB.nhietdo, 0),
      'Weight', COALESCE(KB.cannang, 0),
      'Height', COALESCE(KB.chieucao, 0),
      'Hb', COALESCE(KB.hb, ''),
      'FiO2', COALESCE(KB.fio2, ''),
      'Pulse', COALESCE(KB.mach, 0)                
    )::jsonb AS VitalSign,
    json_build_object(
      'ChiefComplaint', COALESCE(NT.lydovv,''), -- Lý do vào viện
      'HistoryOfPresentIllness', COALESCE(TS.qtbenhly,''), -- Quá trình bệnh lý
      'PastMedicalHistory', COALESCE(TS.tsbanthan,''), -- Tiền sử bản thân
      'FamilyHistory', COALESCE(TS.tsgiadinh,''), -- Tiền sử gia đình
      'GeneralExamination', COALESCE(TQ.toanthan,''), --Toàn thân
      'SystemicExamination', COALESCE(TQ.bophan,''), -- Các bộ phận
      'ParaclinicalResultsSummary', COALESCE(TQ.kqcls,''), -- Kết quả cls
      'TreatmentProvided', COALESCE(TQ.daxutri,'') -- Đã xử trí
    )::jsonb AS AdmissionInformation, -- Thêm các thông tin bổ sung trong phần thông tin nhập viện
    COALESCE(BV.tenbv,'') as ReferLocation, -- Tên bệnh viện chuyển đến
    COALESCE(CV.mabv,'') as ReferHostpitalCode, --Mã bệnh viện chuyển đến
    COALESCE(NT.maicdvv, '') || COALESCE(';' || NT.maicdpvv, '') AS StrAdmICD, --ICD Chẩn đoán nhập viện (cách nhau bằng dấu phẩy) [ÔNG TRIỆU HẬU]
    COALESCE(NT.kqcdoanvv,'')|| COALESCE(';' || NT.kqcdoanpvv, '') AS AdmDiagnosis, --Chẩn đoán nhập viện [ÔNG TRIỆU HẬU] ![](https://live.staticflickr.com/65535/54586935037_59fd3b3303_b.jpg)
    NT.sogiuong AS BedName, --[ÔNG TRIỆU HẬU]
    NT.buong AS RoomName, --[ÔNG TRIỆU HẬU]
    '' AS chuan_sql
 FROM current.bnnoitru  AS NT
    LEFT JOIN current.khambenh  AS KB ON (NT.mabn = KB.mabn and NT.makb = KB.makb and NT.maba = KB.maba and KB.dakham = 5 and KB.manv = NT.manvvv) -- thêm điều kiện dakham = 5 và manv = manvvv (nhập viện) để lấy thông tin sinh hiệu và đảm bảo 1 dòng từ bảng KB
    LEFT JOIN current.psdangky  AS PS ON (NT.mabn = PS.mabn and NT.makb = PS.makb and NT.maba = PS.maba)
    LEFT JOIN current.kbtongquat  AS TQ ON (NT.mabn = TQ.mabn and NT.makb = TQ.makb and NT.maba = TQ.maba)--[Nguyễn Khắc Duy 2026-03-31]: Mở ra để lấy thông tin bổ sung cho phần AdmissionInformation
    LEFT JOIN current.hbtsbenh  AS TS ON (NT.mabn = TS.mabn and NT.makb = TS.makb and NT.maba = TS.maba) --[Nguyễn Khắc Duy 2026-03-31]: Mở ra để lấy thông tin bổ sung cho phần AdmissionInformation
    -- LEFT JOIN current.dmnhanvien  AS NV ON NT.manvvv = NV.manv --[ÔNG TRIỆU HẬU 2025-07-10]: Chuẩn hóa lại, bỏ ra vì không sử dụng
    -- LEFT JOIN current.dmdonvi  AS DV ON NT.madvvv = DV.madv
    -- LEFT JOIN current.dmhsba  AS HS ON NT.mahsba = HS.mahsba
    LEFT JOIN current.dmbenhnhan  AS BN ON NT.mabn = BN.mabn
    LEFT JOIN current.dmdantoc  AS DT ON BN.madt = DT.madt
    LEFT JOIN current.dmquocgia  AS TG ON BN.maqg = TG.maqg
    -- LEFT JOIN current.dmtongiao  AS TGI ON BN.matg = TGI.matg
    LEFT JOIN current.dmnghe  AS NGH ON BN.manghe = NGH.manghe
    -- LEFT JOIN current.dmdoituong  AS DTG ON PS.madt = DTG.madt
    -- LEFT JOIN current.dmphong  AS PH ON KB.maphong = PH.maphong
    LEFT JOIN current.dmxa4750  AS XA ON BN.maxa = XA.id --[ÔNG TRIỆU HẬU]
    LEFT JOIN current.dmhuyen  AS HUYEN ON XA.mahuyen = HUYEN.mahuyen
    LEFT JOIN current.dmtinh  AS TINH ON HUYEN.matinh = TINH.matinh
    LEFT JOIN current.chuyenvien  AS CV ON NT.mabn = CV.mabn AND NT.maba = CV.maba AND NT.makb = CV.makb
    LEFT JOIN current.dmbenhvien  AS BV ON CV.mabv = BV.mabv
    WHERE lower(NT.mabn) = lower(p_mabn)
          AND lower(NT.maba) = lower(p_maba)
    	  AND lower(NT.makb) = lower(p_makb)
  ) AS row_data;
  RETURN result;
END;
$$;
