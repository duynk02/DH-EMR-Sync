module.exports = {
  "badt_dhs.GetSyncEmployee": {
    name: "badt_dhs.GetSyncEmployee",
    para: ["manv"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncEmployee(manv text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-09-11 18:57:46
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

`
  },
  "badt_dhs.GetSyncStoreHouse": {
    name: "badt_dhs.GetSyncStoreHouse",
    para: ["khocp"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncStoreHouse(khocp text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nqhoa1005; date: 2025-06-04 09:32:38
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncStoreHouse(khocp TEXT DEFAULT NULL)
-- Mô tả: Danh mục kho
--   - Nếu khocp IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu khocp có giá trị cụ thể          => lọc theo khocp
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncStoreHouse();        -- Trả toàn bộ kho
--   SELECT badt_dhs.GetSyncStoreHouse('');      -- Trả toàn bộ kho
--   SELECT badt_dhs.GetSyncStoreHouse('14');    -- Chỉ kho mã '01'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/CsVb9h8P/kcx-Am-Mxvdr.png)
  result text;
  p_khocp ALIAS FOR khocp;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      kho.khocp AS "StoreHouseCode",                                            --Mã kho 
      kho.diengiai AS "StoreHouseName",                                         --Tên kho 
      CASE WHEN kho.loai = 1 THEN 1 ELSE 2 END AS "StoreHouseKind",             --Loại kho : 1- Kho chẵn; 2 - Kho lẻ; 3 - Tủ trực
      CASE WHEN kho.noitru != 1 THEN 1 ELSE 0 END AS "IsOutPatient",            --Kho ngoại trú: 0 - Nội trú; 1 - Kho ngoại trú
      CASE WHEN kho.khoaduoc = 1 THEN TRUE ELSE FALSE END AS "IsHI",            --Bảo hiểm : True - Bảo hiểm; False - Không bảo hiểm
      kho.khocpc AS "DepartmentCode",                                           --Mã Khoa/ Phòng
      CASE WHEN COALESCE(dv.xoa,0) = 0 THEN FALSE ELSE TRUE END AS "IsBlocked"  --Khoá
    FROM current.dmkhocp kho
    LEFT JOIN current.dmdonvi dv ON dv.madv = kho.khocp
    WHERE p_khocp IS NULL OR p_khocp = '' OR kho.khocp = p_khocp
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.GetSyncRoom": {
    name: "badt_dhs.GetSyncRoom",
    para: ["maphong"],
    returns: "text",
    codesql: `



CREATE OR REPLACE FUNCTION badt_dhs.GetSyncRoom(maphong text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nqhoa1005; date: 2025-05-26 18:19:56
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncRoom(madv TEXT DEFAULT NULL)
-- Mô tả: Danh mục phòng
--   - Nếu maphong IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maphong có giá trị cụ thể          => lọc theo maphong
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncRoom();        -- Trả toàn bộ phòng
--   SELECT badt_dhs.GetSyncRoom('');      -- Trả toàn bộ phòng
--   SELECT badt_dhs.GetSyncRoom('10');   -- Chỉ khoa mã '10'
-- ===============================================================
-- Mô tả pdf maphong = RoomCode | Json mẫu maphong = RoomNo ==> gửi thành công theo Json mẫu
-- [](https://i.ibb.co/0xm10z8/Postman-1-Uq-BHMAXnm.png)
--R06 - Phòng 6 giường; R07 - Phòng 7 giường; R08 - Phòng 8 giường; R09 - Phòng 9 giường; R10 - Phòng 10 giường; R00 - Khác;
--BB - Buồng bệnh; PM - Phòng mổ; PK - Phòng khám
  result text;
  p_maphong ALIAS FOR maphong;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
     ph.maphong AS "RoomNo",                --Mã phòng
     ph.tenphong AS "RoomName",             --Tên phòng
     ph.madv AS "DepartmentCode",           --Mã Khoa phòng
     CASE WHEN ph.xoa = 0 THEN FALSE ELSE TRUE END AS "IsBlocked",  --Khoá
     CASE WHEN COALESCE(ph.khoakb,0) = 1 THEN 'PK' ELSE 'R00' END AS "RoomType" --Loại phòng : R01 - Phòng 1 giường; R02 - Phòng 2 giường; R03 - Phòng 3 giường; R04 - Phòng 4 giường; R05 - Phòng 5 giường; 
    FROM current.dmphong ph
    WHERE p_maphong IS NULL OR p_maphong = '' OR ph.maphong = p_maphong
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.GetSyncBed": {
    name: "badt_dhs.GetSyncBed",
    para: ["ma_giuong"],
    returns: "text",
    codesql: `



CREATE OR REPLACE FUNCTION badt_dhs.GetSyncBed(ma_giuong text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-07-31 07:55:03
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncBed(ma_giuong TEXT DEFAULT NULL)
-- Mô tả: Danh mục giuờng bệnh
--   - Nếu ma_giuong IS NULL hoặc rỗng ('')     => trả toàn bộ giuờng theo madv
--   - Nếu ma_giuong có giá trị cụ thể          => lọc theo ma_giuong theo madv
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncBed(); 			-- Trả toàn bộ giuờng
--   SELECT badt_dhs.GetSyncBed(''); 		-- Trả toàn bộ giuờng
--   SELECT badt_dhs.GetSyncBed('H001'); 	-- Trả giuờng H001
-- ===============================================================
--[ÔNG TRIỆU HÂU - 2025-07-31] Xử lý để tránh trùng magiuong và madv khi đồng bộ dữ liệu
--   SELECT badt_dhs.GetSyncBed();
  result text;
  p_ma_giuong ALIAS FOR ma_giuong;
  BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT ON (gi.ma_giuong, COALESCE(gi.madv, ''))
       gi.ma_giuong AS "BedNo",        -- Mã giường
       gi.diengiai AS "BedName",       -- Tên giường
       'G' AS "BedType",               -- Loại giường: G - Giường
       COALESCE(gi.madv, '') AS "RoomNo",  -- Mã phòng (khoa)
       CASE WHEN COALESCE(gi.sudung, 0) = 0 THEN FALSE ELSE TRUE END AS "IsBlocked"  -- Khoá
    FROM current.dmgiuongbenh gi
    WHERE p_ma_giuong IS NULL OR p_ma_giuong = '' OR gi.ma_giuong = p_ma_giuong
    ORDER BY gi.ma_giuong, COALESCE(gi.madv, '')
  ) AS row_data;
  RETURN result;
END;
$$;
`
  },
  "badt_dhs.getSyncADM": {
    name: "badt_dhs.getSyncADM",
    para: ["mabn","maba","makb"],
    returns: "text",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getSyncADM(mabn TEXT, maba TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nkduy1512; date: 2026-05-22 09:50:27
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
--[ÔNG TRIỆU HẬU - 2025-07-12] Xử lý để gửi bệnh án ngoại trú
--ngh.ma4750 as OccupationCode, --Mã nghề nghiệp
--[ÔNG TRIỆU HẬU: 2025-09-18] ![](https://live.staticflickr.com/65535/54795319195_59dc667efe_b.jpg)
--[ÔNG TRIỆU HẬU: 2025-11-12] Xử lấy id gửi vào CAWardCode
--bn.ngoaikieu as CACountryCode, --Ngoại kiều
-- LEFT JOIN current.dmnhanvien  AS NV ON NT.manvvv = NV.manv --[ÔNG TRIỆU HẬU 2025-07-10]: Chuẩn hóa lại, bỏ ra vì không sử dụng
-- LEFT JOIN current.dmdonvi  AS DV ON NT.madvvv = DV.madv
-- LEFT JOIN current.dmhsba  AS HS ON NT.mahsba = HS.mahsba
-- LEFT JOIN current.dmtongiao  AS TGI ON BN.matg = TGI.matg
-- LEFT JOIN current.dmdoituong  AS DTG ON PS.madt = DTG.madt
-- LEFT JOIN current.dmphong  AS PH ON KB.maphong = PH.maphong
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
    COALESCE(ngh.manghe,'') as OccupationCode, --Mã nghề nghiệp
    COALESCE(bn.diachi,'') as CurrentAddress, --Địa chỉ
    COALESCE(xa.id,'') as CAWardCode, --Phường [ÔNG TRIỆU HẬU], lấy theo current.dmxa4750, theo danh mục chung của BYT
    COALESCE(xa.mahuyen,'') as CADistrictCode, --Quận [ÔNG TRIỆU HẬU]
    COALESCE(xa.matinh,'') as CACityProvinceCode, --Tỉnh [ÔNG TRIỆU HẬU]
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
    LEFT JOIN current.dmbenhnhan  AS BN ON NT.mabn = BN.mabn
    LEFT JOIN current.dmdantoc  AS DT ON BN.madt = DT.madt
    LEFT JOIN current.dmquocgia  AS TG ON BN.maqg = TG.maqg
    LEFT JOIN current.dmnghe  AS NGH ON BN.manghe = NGH.manghe
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

`
  },
  "badt_dhs.getSyncADM_ByDmbenhnhan": {
    name: "badt_dhs.getSyncADM_ByDmbenhnhan",
    para: ["mabn"],
    returns: "void",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getSyncADM_ByDmbenhnhan(mabn TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-10-22 14:43:23
-- ===============================================================
-- Thực hiện: ÔNG TRIỆU HẬU - 2025-06-24
-- Hàm: badt_dhs.getSyncADM_ByDmbenhnhan(mabn TEXT)
-- Mô tả:
--	 - Người thực hiện: ongtrieuhau
--   - mabn	Mã số bệnh nhân
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncADM_ByDmbenhnhan(mabn);  Đồng bộ lại thông tin hành chánh bệnh nhân thay đổi.
-- ===============================================================
-- 1. Duyệt qua tất cả các bản ghi của mabn
--[ÔNG TRIỆU HẬU: 2025-10-22]: Bổ sung đẩy lại thông tin ngoại trú 
--                             mabn,makb,maba,bant, gửi tới psdangky vưới operation: INSERT
-- Lấy từ bnnoitru
-- Lấy từ psdangky (chỉ lấy 1 bản ghi mới nhất) - dùng subquery
-- Tăng biến đếm
-- 2. Tạo payload dưới dạng JSON cho mỗi bản ghi
-- 3. Gọi pg_notify để gửi dữ liệu đồng bộ cho pgListener cho mỗi bản ghi
-- Kiểm tra kết quả từng row
-- 4. Thông báo tổng kết
  result RECORD;
  payload JSONB;
  p_mabn TEXT := lower(mabn);  -- Alias cho biến mabn
  row_count INTEGER := 0;  -- Biến đếm số row được xử lý
BEGIN
  FOR result IN
    SELECT 
      nt.mabn, 
      nt.makb, 
      nt.maba, 
      COALESCE(nt.bant, 0) AS bant, 
      COALESCE(nt.namvien, 0) AS namvien,
      NULL::timestamp AS ngaydk,
      'current.bnnoitru' AS channel
    FROM current.bnnoitru AS nt
    WHERE lower(nt.mabn) = p_mabn
      AND COALESCE(nt.bant, 0) = 0
      AND COALESCE(nt.namvien, 0) = 1
      AND COALESCE(nt.ravien, 0) = 0
      AND COALESCE(nt.namkt, '') || COALESCE(nt.thangkt, '') > '202507'
    
    UNION ALL

    SELECT 
      sub.mabn, 
      sub.makb, 
      sub.maba,
      NULL AS bant,
      NULL AS namvien,
      sub.ngaydk,
      'current.psdangky' AS channel
    FROM (
      SELECT 
        ps.mabn, 
        ps.makb, 
        ps.maba,
        ps.ngaydk
      FROM current.psdangky AS ps
      WHERE lower(ps.mabn) = p_mabn
        AND (COALESCE(ps.maba, '') = '' OR ps.maba LIKE 'N%')
      ORDER BY ps.ngaydk DESC
      LIMIT 1
    ) AS sub
    
  LOOP
    row_count := row_count + 1;
    
    payload := jsonb_build_object(
      'bant', result.bant,
      'maba', result.maba,
      'mabn', result.mabn,
      'makb', result.makb,
      'namvien', result.namvien,
      'operation', 'INSERT',  -- Giả sử là thao tác INSERT
      'channel', result.channel
    );

    PERFORM pg_notify('badt_dhs', payload::text);

    RAISE NOTICE '[Row %] Đã gửi thông báo đồng bộ [%] với payload: %', row_count, result.channel, payload;
  END LOOP;

  IF row_count = 0 THEN
    RAISE NOTICE 'Không tìm thấy dữ liệu nào cho mã bệnh nhân: %', p_mabn;
  ELSE
    RAISE NOTICE '===== Hoàn thành đồng bộ: Đã xử lý % row(s) cho mã bệnh nhân: % =====', row_count, p_mabn;
  END IF;

END;
$$;
`
  },
  "badt_dhs.getSyncADM_Ngoai": {
    name: "badt_dhs.getSyncADM_Ngoai",
    para: ["mabn","makb"],
    returns: "text",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getSyncADM_Ngoai(mabn TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nkduy1512; date: 2026-05-22 09:50:27
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
-- Lấy bản ghi khambenh mới nhất
--[ÔNG TRIỆU HẬU: 2025-08-10] Xử lý lấy mã phòng cuối cùng để gửi EMR
-- PS.madv as DepartmentCode, --Mã khoa vào 
-- PS.maphong as DepartmentCode, --Mã khoa vào [ÔNG TRIỆU HẬU: 2025-07-13]: ![](https://live.staticflickr.com/65535/54651031216_9bbefec13d_b.jpg)
-- PS.maphong as RoomNo, --Phòng
--[ÔNG TRIỆU HẬU: 2025-08-10] Xử lý lấy mã phòng cuối cùng để gửi EMR
--ngh.ma4750 as OccupationCode, --Mã nghề nghiệp
--[ÔNG TRIỆU HẬU: 2025-09-18] ![](https://live.staticflickr.com/65535/54795319195_59dc667efe_b.jpg)
  result text;
  p_mabn ALIAS FOR mabn; --alias cho biến mabn
  p_makb ALIAS FOR makb; --alias cho biến makb
  v_kb RECORD; -- Lưu cả dòng từ khambenh mới nhất
BEGIN

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
`
  },
  "badt_dhs.getSyncPATFR": {
    name: "badt_dhs.getSyncPATFR",
    para: ["mabn","maba","makb"],
    returns: "text",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getSyncPATFR(mabn TEXT, maba TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-11-18 11:35:35
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
--[ÔNG TRIỆU HẬU - 2025-08-19] Bổ sung thêm ![](https://live.staticflickr.com/65535/54731200250_d4b03a2276_b.jpg)
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
`
  },
  "badt_dhs.getSyncPATFR_Ngoai": {
    name: "badt_dhs.getSyncPATFR_Ngoai",
    para: ["mabn","makb"],
    returns: "text",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getSyncPATFR_Ngoai(mabn TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-08-19 18:52:14
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
--[ÔNG TRIỆU HẬU - 2025-08-19] Bổ sung thêm ![](https://live.staticflickr.com/65535/54731200250_d4b03a2276_b.jpg)
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
`
  },
  "badt_dhs.getSyncDCHG": {
    name: "badt_dhs.getSyncDCHG",
    para: ["mabn","maba","makb"],
    returns: "text",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getSyncDCHG(mabn TEXT, maba TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-06-17 13:23:08
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
`
  },
  "badt_dhs.getSyncDCHG_Ngoai_Khambenh": {
    name: "badt_dhs.getSyncDCHG_Ngoai_Khambenh",
    para: ["mabn","makb"],
    returns: "text",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getSyncDCHG_Ngoai_Khambenh(mabn TEXT, makb TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-07-28 11:16:15
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
--Use: SELECT badt_dhs.getSyncDCHG_Ngoai_Khambenh('mabn', 'makb');
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

`
  },
  "badt_dhs.GetSyncInvType": {
    name: "badt_dhs.GetSyncInvType",
    para: ["khoql"],
    returns: "text",
    codesql: `



CREATE OR REPLACE FUNCTION badt_dhs.GetSyncInvType(khoql text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-06-13 22:01:49
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncInvType(madv TEXT DEFAULT NULL)
-- Mô tả: Danh mục loại thuốc
--   - Nếu khoql IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu khoql có giá trị cụ thể          => lọc theo khoql
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncInvType();        -- Trả toàn bộ loại thuốc
--   SELECT badt_dhs.GetSyncInvType('');      -- Trả toàn bộ loại thuốc
--   SELECT badt_dhs.GetSyncInvType('01');   -- Chỉ loại thuốc mã '01'
-- ===============================================================
-- Mô tả pdf maphong = RoomCode | Json mẫu maphong = RoomNo ==> gửi thành công theo Json mẫu
-- [](https://i.ibb.co/0xm10z8/Postman-1-Uq-BHMAXnm.png)
  result text;
  p_khoql ALIAS FOR khoql;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
     	ql.khoql AS "InvTypeCode",
        ql.diengiai AS "InvTypeName",
        CASE WHEN ql.kho = '06' THEN 'OM' WHEN ql.kho = '07' THEN 'EM' ELSE 'WM' END AS "PType",
        FALSE AS "IsBlocked"
    FROM current.dmkhoql ql
    WHERE p_khoql IS NULL OR p_khoql = '' OR ql.khoql = p_khoql
  ) AS row_data;
  RETURN result;
END;
$$;
`
  },
  "badt_dhs.GetSyncInventory": {
    name: "badt_dhs.GetSyncInventory",
    para: ["mahh"],
    returns: "text",
    codesql: `




CREATE OR REPLACE FUNCTION badt_dhs.GetSyncInventory(mahh text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nkduyt25013; date: 2026-03-31 13:47:28
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncInventory(madv TEXT DEFAULT NULL)
-- Mô tả: Danh mục thuốc
--   - Nếu mahh IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu mahh có giá trị cụ thể          => lọc theo mahh
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncInventory();        -- Trả toàn bộ thuốc
--   SELECT badt_dhs.GetSyncInventory('');      -- Trả toàn bộ thuốc
--   SELECT badt_dhs.GetSyncInventory('01');   -- Chỉ thuốc mã '01'
-- ===============================================================
--[ÔNG TRIỆU HẬU - 2025-08-21]: Xử lý COALESCE để không null khi gửi lên EMR, ![](https://live.staticflickr.com/65535/54735119381_9861374faa_b.jpg)
  result text;
  p_mahh ALIAS FOR mahh;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
  	SELECT
    	  COALESCE(th.mahh,'') AS "InvCode",
        COALESCE(th.khoql,'') AS "InvTypeCode",
    	  COALESCE(th.tenhh,'') AS "InvName",
        COALESCE(th.dvt,'') AS "UOMCode",
        COALESCE(th.dvt,'') AS "DoseUOMCode",
        COALESCE(th.tenhc,'') AS "ActiveIngredient",
        COALESCE(th.hamluong,'') AS "DrugContent",
        COALESCE(th.madd,'') AS "MedUsageCode",
        COALESCE(th.nuocsx,'') AS "NationCode",
        COALESCE(th.quicachdg,'') AS "ModelPacking",
        COALESCE(th.ghichu, '') AS "InvNotes", --[Nguyễn Khắc Duy - 2026-03-31] bổ sung field InvNotes theo yêu cầu
        CASE WHEN COALESCE(th.xoa,0) = 1 THEN TRUE ELSE FALSE END AS "IsBlocked",
        COALESCE(kho.bhyt,0) AS "IsHI" --[ÔNG TRIỆU HẬU - 2025-08-01] Bổ sung thêm theo yêu cầu
    FROM current.dmthuoc th
    LEFT JOIN current.dmkho AS kho ON kho.mahh = th.mahh
    WHERE p_mahh IS NULL OR p_mahh = '' OR th.mahh = p_mahh
  ) AS row_data;
  RETURN result;
END;
$$;
`
  },
  "badt_dhs.getSyncCountry": {
    name: "badt_dhs.getSyncCountry",
    para: ["maqg"],
    returns: "text",
    codesql: `



CREATE OR REPLACE FUNCTION badt_dhs.getSyncCountry(maqg text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-06-14 13:43:59
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getSyncCountry(maqg TEXT DEFAULT NULL)
-- Mô tả: Danh mục quốc gia
--   - Nếu maqg IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maqg có giá trị cụ thể          => lọc theo maqg
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncCountry();        -- Trả toàn bộ quốc gia
--   SELECT badt_dhs.getSyncCountry('');      -- Trả toàn bộ quốc gia
--   SELECT badt_dhs.getSyncCountry('VN');   -- Chỉ quốc gia mã 'VN'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/ZzvVW4RP/Postman-e9-IGy7-TL47.png)
-- Gửi lỗi khi dộ dài maqg vuợt 10 ký tự [](https://i.ibb.co/8gvQgh7B/g-CZCk-Ssuu-R.png)
  result text;
  p_maqg ALIAS FOR maqg;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      qg.maqg AS "CountryCode",                   	-- Mã quốc gia
      qg.tenqg AS "CountryName",                 	-- Tên quốc gia
      FALSE AS "IsBlocked"	     -- Khoá
    FROM current.dmquocgia qg
    WHERE COALESCE(p_maqg,'') = '' OR qg.maqg = p_maqg
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.getCUTreatmentProcess": {
    name: "badt_dhs.getCUTreatmentProcess",
    para: ["mabn","maba","makb","iddienbien"],
    returns: "text",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getCUTreatmentProcess(mabn text, maba text, makb text,iddienbien text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nkduy1512; date: 2026-05-21 11:12:59
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-05-27
-- Hàm: badt_dhs.getCUTreatmentProcess(mabn TEXT, maba TEXT, makb TEXT, iddienbien TEXT)
-- Mô tả:
--   - mabn	Mã số bệnh nhân
--   - maba	Mã số bệnh án
--   - makb	Mã số khám bệnh
--   - iddienbien	ID diễn biến
-- Sử dụng:
--   SELECT badt_dhs.getCUTreatmentProcess(mabn, maba, makb, iddienbien);  -- Trả về: thông tin điều trị
-- ===============================================================
-- [Nguyễn Khắc Duy - 2026-04-02] Bổ sung thông tin nhập viện để fallback khi dienbien trống
-- 2) Nở maicdp / kqcdoanp thành nhiều dòng (chỉ dùng khi thật sự có dữ liệu phụ)
-- 3) Gom các loại chẩn đoán vào chung một CTE
-- 4) Đánh số thứ tự để build JSON diagnois
-- [ÔNG TRIỆU HẬU - 2025-10-01]: Bổ sung các thông tin giường bệnh lên EMR, khi gửi tờ điều trị 
-- NT.sogiuong AS BedName, --[ÔNG TRIỆU HẬU]
-- NT.buong AS RoomName, --[ÔNG TRIỆU HẬU]
-- COALESCE(NULLIF(NT.maphong, ''), NT.buong) as RoomNo, --Phòng
-- NT.sogiuong as BedNo, --Giường
    result text;
    p_mabn ALIAS FOR mabn;
    p_maba ALIAS FOR maba;
    p_makb ALIAS FOR makb;
    p_iddienbien ALIAS FOR iddienbien;
BEGIN
    WITH data AS (
    SELECT dt.*
    FROM current.qtdieutri dt
    WHERE lower(dt.mabn) = lower(p_mabn)
      AND lower(dt.maba) = lower(p_maba)
      AND lower(dt.makb) = lower(p_makb)
      AND lower(dt.iddienbien) = lower(p_iddienbien)
  ),

  adm_info AS (
        SELECT 
            string_agg('- ' || val, E'\n' ORDER BY ord) AS infor_fallback
        FROM (
            SELECT
                NT.lydovv AS lydovv,
                TS.qtbenhly AS qtbenhly,
                COALESCE(NULLIF(BN.bophan, ''), NULLIF(CT.bophan, ''), '') AS bophan
            FROM current.bnnoitru NT
            LEFT JOIN current.hbtsbenh TS ON NT.mabn = TS.mabn AND NT.maba = TS.maba AND NT.makb = TS.makb
            LEFT JOIN current.bangoai BN ON NT.mabn = BN.mabn AND NT.maba = BN.maba AND NT.makb = BN.makb
            LEFT JOIN current.bayhct CT ON NT.mabn = CT.mabn AND NT.maba = CT.maba AND NT.makb = CT.makb
            WHERE NT.mabn = p_mabn
              AND NT.maba = p_maba
              AND NT.makb = p_makb
        ) src
        CROSS JOIN LATERAL
            ( VALUES
                (1, src.lydovv),
                (2, src.qtbenhly),
                (3, src.bophan)
            ) t(ord, val)
        WHERE COALESCE(val,'') <> ''
  ),
diag_sub AS (      
    SELECT d.*,
           m.idx                  AS idx_diag,          -- vị trí phần tử
           m.macd,                                      -- mã ICD phụ
           COALESCE(k.chandoan,'') AS kqcdoanp_split     -- diễn giải phụ khớp chỉ số
    FROM data d
    CROSS JOIN LATERAL                    -- tách maicdp thành mảng
         unnest(string_to_array(d.maicdp,';')) WITH ORDINALITY AS m(macd,idx)
    LEFT  JOIN LATERAL                    -- tách kqcdoanp rồi “zip” theo idx
         ( SELECT chandoan, idx2
           FROM   unnest(string_to_array(d.kqcdoanp,';'))
                        WITH ORDINALITY AS k(chandoan,idx2)
         ) k ON k.idx2 = m.idx
),
json_data_raw AS (
    /* ---- Chẩn đoán YHCT -------------------------------------------------- */
    SELECT  d.iddienbien, d.mabn, d.maba, d.makb,
            ngaygio, madv, manv, chamsoc, dienbien,
            kqcdoan, kqcdoanp, tenyhct,               -- giữ nguyên
            mayhct      AS macd,
            tenyhct     AS chandoan,
            2           AS loai,          -- YHCT
            false       AS smain,
            mach, huyetap, nhiptho, nhietdo, cannang,
            chieucao, hb, fio2, maphong, sogiuong,
            'Mạch (lần/phút): '||mach||', Nhiệt độ (°C): '||nhietdo||
            ', Huyết áp (mmHg): '||huyetap||
            ', Nhịp thở (lần/phút): '||nhiptho||
            ', Cân nặng (kg): '||cannang||
            ', Chiều cao (m): '||chieucao  AS VitalSignCommand,
            buong
    FROM data d
    WHERE COALESCE(tenyhct,'') <> ''

    UNION ALL
    /* ---- Chẩn đoán hiện đại – chính -------------------------------------- */
    SELECT  d.iddienbien, d.mabn, d.maba, d.makb,
            ngaygio, madv, manv, chamsoc, dienbien,
            kqcdoan, kqcdoanp, tenyhct,
            maicd       AS macd,
            kqcdoan     AS chandoan,
            1           AS loai,          -- hiện đại
            true        AS smain,
            mach, huyetap, nhiptho, nhietdo, cannang,
            chieucao, hb, fio2, maphong, sogiuong,
            'Mạch (lần/phút): '||mach||', Nhiệt độ (°C): '||nhietdo||
            ', Huyết áp (mmHg): '||huyetap||
            ', Nhịp thở (lần/phút): '||nhiptho||
            ', Cân nặng (kg): '||cannang||
            ', Chiều cao (m): '||chieucao  AS VitalSignCommand,
            buong
    FROM data d

    UNION ALL
    /* ---- Chẩn đoán hiện đại – phụ (đã tách) ------------------------------ */
    SELECT  ds. iddienbien, ds.mabn, ds.maba, ds.makb,
            ngaygio, madv, manv, chamsoc, dienbien,
            kqcdoan       AS kqcdoan,          -- chính (có thể rỗng)
            ds.kqcdoanp_split AS kqcdoanp,     -- diễn giải phụ sau tách
            tenyhct,
            ds.macd,                           -- mã ICD phụ rời
            ds.kqcdoanp_split AS chandoan,     -- diễn giải trùng khớp
            1            AS loai,              -- hiện đại
            false        AS smain,
            mach, huyetap, nhiptho, nhietdo, cannang,
            chieucao, hb, fio2, maphong, sogiuong,
            'Mạch (lần/phút): '||mach||', Nhiệt độ (°C): '||nhietdo||
            ', Huyết áp (mmHg): '||huyetap||
            ', Nhịp thở (lần/phút): '||nhiptho||
            ', Cân nặng (kg): '||cannang||
            ', Chiều cao (m): '||chieucao  AS VitalSignCommand,
            buong
    FROM diag_sub ds
),

json_data AS (
    SELECT jdr.*,
           ROW_NUMBER() OVER (
               PARTITION BY jdr.mabn, jdr.maba, jdr.makb, jdr.iddienbien
               ORDER BY loai /* YHCT=2 sẽ xếp sau */ , smain DESC
           ) AS stt
    FROM json_data_raw jdr
)

/* ========================== */
    
  SELECT json_build_object(
    /* --- Thông tin chung ------------------------------------------ */
           'TPCode',                dtf.iddienbien,
           'PatientCode',           dtf.mabn,
           'AdmissionCode',         dtf.makb,
           'MedicalRecordNo',       dtf.maba,
           'TPDate',                to_char(ngaygio AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD"T"HH24:MI:SS'),
           'TreatmentDoctorCode',   manv,
           'DepartmentCode',        madv,
           'ParaClinicalResultCommand', '',
           'VitalSignCommand',      VitalSignCommand,
           'RiskOfFalling',         0,
           'TakeCare',              0,
           'FollowUpCommand',       chamsoc,
           'MethodOfTreatmentCommand', '',
           'NutritionCommand',      '',
           'Infor',                 CASE 
                                        WHEN COALESCE(dienbien,'') <> '' THEN dienbien
                                        ELSE(SELECT infor_fallback FROM adm_info)
                                   END,
           'DiseaseName',           '',
           'IsNotChange',           false,
           'FileDocID',             '',
           'FilePath',              '',
           'SignStatus',            0,
           'Reason',                '',
           /* Gộp mô tả chính + phụ đã tách (nên dùng string_agg) ----------- */
           'DiagnosisDesc',
                 kqcdoan || ',' ||
                 (SELECT string_agg(DISTINCT kqcdoanp, '; ')
                    FROM json_data jd2
                    WHERE jd2.iddienbien = dtf.iddienbien),
           'DiagnosisTraditionalDesc', tenyhct,
           'DiagnosisOtherDesc',     '',
           /* --- Vital Sign ----------------------------------------------- */
           'VitalSign', json_build_object(
               'ExecutorCode',          manv,
               'BloodPressureSystolic', CASE WHEN position('/' in huyetap) > 0
                                             THEN COALESCE(NULLIF(substring(split_part(huyetap, '/', 1) from '^[0-9]+'), '')::numeric, 0)
                                        ELSE 0 END,
               'BloodPressureDiastolic',CASE WHEN position('/' in huyetap) > 0
                                             THEN COALESCE(NULLIF(substring(split_part(huyetap, '/', 2) from '^[0-9]+'), '')::numeric, 0)
                                        ELSE 0 END, --[ÔNG TRIỆU HẬU - 2025-08-09] Xử lý để không lỗi khi nhập sai, trường hợp sai: 100/70-
               'BreathBeat',            COALESCE(nhiptho,0),
               'BodyTemperature',       COALESCE(nhietdo,0),
               'Weight',                COALESCE(cannang,0),
               'Height',                COALESCE(chieucao,0),
               'Hb',                    hb,
               'FiO2',                  fio2,
               'Pulse',                 COALESCE(mach,0)
           ),
           /* --- Danh sách chẩn đoán -------------------------------------- */
           'Diagnosis', json_agg(
               json_build_object(
                   'OrderNum',        stt,
                   'DiagnosisICDCode',macd,
                   'DiagnosisDesc',   chandoan,
                   'DiagnosisType',   loai,
                   'IsMain',          smain
               )
               ORDER BY stt
           ),
           'BedName',                dtf.sogiuong,
           'RoomName',               COALESCE(dtf.buong,''),
           'RoomNo',                 COALESCE(NULLIF(dtf.maphong, ''), dtf.sogiuong),
           'BedNo',                  dtf.sogiuong
       ) INTO result
  FROM json_data dtf
  GROUP BY dtf.iddienbien, dtf.mabn, dtf.maba, dtf.makb, ngaygio,
         madv, manv, chamsoc, dienbien, kqcdoan,
         VitalSignCommand, tenyhct, huyetap, nhiptho,
         nhietdo, cannang, chieucao, hb, fio2, mach,
         dtf.sogiuong, dtf.buong, dtf.maphong;
    RETURN result;
END;
$$;
`
  },
  "badt_dhs.insertTreatmentProcess": {
    name: "badt_dhs.insertTreatmentProcess",
    para: ["input_json"],
    returns: "JSONB",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.insertTreatmentProcess(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
-- Lastest commit: author:nkduy1512; date: 2026-05-21 11:12:59
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-06-19
-- Hàm: badt_dhs.insertTreatmentProcess_Thuoc_CLS(input_json JSONB)
-- Mô tả:
--   - input_json: nội dung file json: quá trình điều trị có thuốc và cls
-- Sử dụng:
--   SELECT badt_dhs.insertTreatmentProcess(input_json JSONB);  --Insert vào current.qtdieutri từ DHS
--   Nếu có thuốc gọi hàm insert thuốc (inserttpprescription)
--   Nếu có cls gọi hàm inser cls(insertcutpparaclinrequest)
-- ===============================================================
-- ![](https://live.staticflickr.com/65535/54713027112_36fd840249_b.jpg)
--noitru
-- Phụ: gom chuỗi bằng dấu ;
-- Biến dùng để bắt lỗi
-- Biến kiểm tra ICD 
--Biến kiểm tra số lượng ICD
--
-- Thử cập nhật 
--[ÔNG TRIỆU HẬU: 2025-09-26] Nếu ngày diễn biến (TPDate) lớn hơn ngày server thì chặn lại 
--  ![](https://storage.googleapis.com/accurately-sharp-katydid.appspot.com/ShareX/2025/09/DESKTOP-2FLMTI6-%25pn-2025-09-26-09h47p19.526.png) 
----[ntvuong: 2025-10-03] Kiểm tra mã giường (BedNo) null
----[ntvuong: 2025-10-09] Kiểm tra (VitalSign) null
----[ntvuong: 2025-10-03] Kiểm tra trùng mã giường (BedNo)
----[ntvuong: 2025-12-03] Lấy tên khoa
--[ntvuong: 2026-03-05] Kiểm tra mã giường (BedNo) có thuộc khoa (r_bnnoitru.madv) hay không?
--1.Kiểm tra mã giường có BN khác sử dụng chưa?
--RAISE NOTICE 'BedNo: %, madv:%, mabn: %, makba: %', BedNo,COALESCE(r_bnnoitru.madv,''), PatientCode, MedicalRecordNo;
--[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra diễn biến rỗng, ảnh hưởng XML08
--[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra trạng thái ra viện
-- Kiểm tra 
--[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra tồn tại ICD
--[ÔNG TRIỆU HẬU: 2025-09-13] Kiểm tra tồn tại ICD YHCT
--[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra tồn tại macls
-- Xử lý chẩn đoán
-- [ÔNG TRIỆU HẬU: 2025-08-11] Ưu tiên lấy DiagnosisICDName, nếu không có thì lấy DiagnosisDesc
-- dt_tenyhct := Diagnosis->>'DiagnosisDesc';
-- [ÔNG TRIỆU HẬU - 2025-08-14]: Đổi lại lấy theo DiagnosisDesc ![](https://live.staticflickr.com/65535/54720329188_0d06fb44e4_b.jpg)
-- [ÔNG TRIỆU HẬU: 2025-08-11] Ưu tiên lấy DiagnosisICDName, nếu không có thì lấy DiagnosisDesc
-- dt_kqcdoan := Diagnosis->>'DiagnosisDesc';
--Chẩn đoán phụ               
-- [ÔNG TRIỆU HẬU: 2025-08-11] Ưu tiên lấy DiagnosisICDName, nếu không có thì lấy DiagnosisDesc
-- dt_kqcdoanp_arr := array_append(dt_kqcdoanp_arr, Diagnosis->>'DiagnosisDesc');
--[2026-01-09:Ông Triệu Hậu]: Bỏ các kiểm tra tồn tại các cột api trong qtdieutri,chungtu,chidinhcls
-- Lấy tháng/năm kế toán
-- Lấy thông tin nội trú
-----------------------------------
-----------------------------------
--Kiểm tra số lượng ICD có vượt cấu hình không
--[Vương] 30/09/2025
--[ÔNG TRIỆU HẬU: 2025-10-18]: Bổ sung điều kiện ma_benh_kt.soluong.noitru <> 1 mới kiểm tra toàn bộ qtdieutri
-----------------------------------
-----------------------------------
-- Thực hiện insert/update
--Update bnnoitru
--[ÔNG TRIỆU HẬU: 2025-09-28]: Không cập nhật lại madv, ảnh hưởng tới danh sách đang điều trị tại HIS
-- ![](https://i.vgy.me/3FYenN.png)
--madv = DepartmentCode,
--Update ttcon (mã thẻ 2)
--[NTV 31/03/2026: Bổ sung thêm mã giường và danh mục giường bệnh]
-- Gọi hàm thêm thuốc nếu có
-- Gọi hàm thêm CLS nếu có
    TPCode TEXT; --Mã tờ điều trị: iddienbien
    PatientCode TEXT;--Mã bệnh nhân: mabn
    AdmissionCode TEXT;--Mã tiếp nhận: makb
    MedicalRecordNo TEXT;--Mã bệnh án
    TPDate TIMESTAMP; --Ngày tờ điều trị: ngaygio
    TreatmentDoctorCode TEXT;--Mã số bs chỉ định điều trị: manv
    DepartmentCode TEXT;--Mã khoa chỉ định điều trị:madv
    ParaClinicalResultCommand TEXT;
    VitalSignCommand TEXT; --Chỉ số sinh hiệu
    RiskOfFalling INT; --Té ngã: 1-Thấp, 2-Cao, 3-Trung bình
    TakeCare INT; --Chế độ chăm sóc: 1-Cấp 1, 2-Cấp 2, 3-Cấp 3
    FollowUpCommand TEXT;--Chăm sóc: chamsoc
    MethodOfTreatmentCommand TEXT;
    NutritionCommand TEXT;
    Infor TEXT; --Diễn biến: dienbien
    DiseaseName TEXT;
    IsNotChange BOOLEAN := FALSE;
    FileDocID TEXT;
    FilePath TEXT;
    SignStatus INT := 0;--Trạng thái
    Reason TEXT;--Lý do hủy
    DiagnosisDesc TEXT; --Chẩn đoán hiện đại: kqcdoan || ',' || kqcdoanp
    DiagnosisICDName TEXT; -- [ÔNG TRIỆU HẬU: 2025-08-11]: Đồng bộ dữ liệu ICD >> Theo HIS đề xuất, EMR có bổ sung 1 field DiagnosisICDName >> HIS lấy field này thay cho DiagnosisDesc như hiện tại
    DiagnosisTraditionalDesc TEXT;--Chẩn đoán YHCT: tenyhct
    DiagnosisOtherDesc TEXT;
    Prescriptions JSONB; --Thông tin thuốc
    ParaClinRequests JSONB; --Thông tin CLS
    Diagnosis JSONB; -- Thông tin chẩn đoán

    VitalSign JSONB; -- Dấu hiệu sinh tồn
    VSDate TIMESTAMP; --Ngày giờ ghi nhận dấu hiệu sinh tồn
    ExecutorCode TEXT; --Mã nhân viên thực hiện
    ExecutorName TEXT; --Tên nhân viên thực hiện

    Height NUMERIC; --: 120.0, Chiều cao của bệnh nhân (cm)
    Weight NUMERIC; --": 40.0, Cân nặng của bệnh nhân (kg)
    BMI NUMERIC; --": 27.8, Chỉ số khối cơ thể (BMI)
    BloodPressureSystolic INT; --": 140.0, Huyết áp tâm thu (mmHg)
    BloodPressureDiastolic INT;--: 100.0, Huyết áp tâm trương (mmHg)
    BodyTemperature NUMERIC; --": 37.0,Nhiệt độ cơ thể (°C)
    Pulse NUMERIC; --": 59.0,Nhịp tim (lần/phút)
    BreathBeat NUMERIC; --": 20.0, Nhịp thở (lần/phút)
    SpO2 NUMERIC; --": 99.0, Độ bão hòa oxy trong máu (%)
    Para TEXT;
    I_RHType INT; --Loại Rh máu (1: Rh+, 2: Rh-)
    I_BloodType INT; --Nhóm máu (1: A, 2: B, 3: AB, 4: O, 5: Chưa xác định)

    nt_maphong TEXT := NULL;
    nt_sogiuong TEXT := NULL;
    nt_huyetap TEXT := NULL;

    thangnam TEXT;
    thangkt_S TEXT; -- thangkt, lấy cho đủ số liệu, toa thuốc mới lên module
    namkt_S TEXT; --namkt, lấy cho đủ số liệu, toa thuốc mới lên module

    dt_maicd TEXT := NULL;
    dt_kqcdoan TEXT := NULL;

    dt_mayhct TEXT := NULL;
    dt_tenyhct TEXT := NULL;
    
    record_exists BOOLEAN := FALSE;
    insert_success BOOLEAN := TRUE;
    
    dt_maicdp_arr TEXT[] := ARRAY[]::TEXT[];
    dt_kqcdoanp_arr TEXT[] := ARRAY[]::TEXT[];
    dt_maicdp TEXT := NULL;
    dt_kqcdoanp TEXT := NULL;
    
    v_err_context TEXT;
    v_err_msg TEXT;

    missing_icds TEXT[];
    BedNo TEXT := NULL;
    CurrentDateTime timestamptz;
    
    ma_benh_kt_soluong Numeric :=0;
    icds TEXT := '';
    icds2 TEXT := '';
    icd_count Numeric :=0;
    icd_count2 Numeric :=0;
    r_bnnoitru RECORD;
    nt_magiuong TEXT:='';
	IsInsertGB BOOLEAN := FALSE;
BEGIN
    TPCode := input_json->>'TPCode';
    PatientCode := input_json->>'PatientCode';
    AdmissionCode := input_json->>'AdmissionCode';
    MedicalRecordNo := input_json->>'MedicalRecordNo';
    TreatmentDoctorCode := input_json->>'TreatmentDoctorCode';
    Infor := input_json->>'Infor';
    BedNo := input_json->>'BedNo';
    TPDate := (input_json->>'TPDate')::timestamptz;

    CurrentDateTime := NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh';
    /* --[ÔNG TRIỆU HẬU: 2025-10-27] Tạm ngưng
    IF TPDate > CurrentDateTime THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Ngày diễn biến (TPDate): %s - Không thể lớn hơn ngày hiện tại: %s. (Mabn: %L, Makb: %L, Maba: %L)', 
                TO_CHAR(TPDate AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS'),
                TO_CHAR(CurrentDateTime, 'YYYY-MM-DD HH24:MI:SS'),
                PatientCode, AdmissionCode, MedicalRecordNo)
        );
    END IF;
    */
    /*
    IF COALESCE(BedNo,'')='' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mã giường (BedNo): Không thể rỗng.')
        );
    END IF;
    */
    IF NOT (input_json ? 'VitalSign') 
    	OR input_json->'VitalSign' IS NULL 
        OR input_json->'VitalSign' = 'null'::jsonb
        OR input_json->'VitalSign' = '""'::jsonb
        OR input_json->'VitalSign' = '[]'::jsonb
        THEN
        RETURN jsonb_build_object(
            'status','error',
            'message','Chưa nhập (VitalSign) cho người bệnh!'
        );
    END IF;
    SELECT giatri INTO nt_magiuong FROM current.system WHERE tents = 'nt.magiuong';
    
    SELECT nt.*, dv.tendv
    INTO r_bnnoitru
    FROM current.bnnoitru nt
    	INNER JOIN current.dmdonvi dv ON nt.madv = dv.madv
    WHERE mabn = PatientCode AND makb = AdmissionCode AND maba = MedicalRecordNo ;

  IF COALESCE(r_bnnoitru.namvien,0) > 0 THEN
     IF NOT EXISTS ( 
              SELECT 1
              FROM current.dmgiuongbenh 
              WHERE COALESCE(ma_giuong,'') = COALESCE(BedNo,'')
                  AND madv = r_bnnoitru.madv
                  AND COALESCE(sudung,0) = 0
              
            ) THEN
                RETURN jsonb_build_object('status', 'error', 'message', 
                    format('Mã giường (BedNo): %s, KHÔNG thuộc khoa [%s]: %s !',BedNo,COALESCE(r_bnnoitru.madv,''),r_bnnoitru.tendv)
          );
      END IF;
   END IF;
    
	IF COALESCE(BedNo,'') <> '' THEN 
    IF EXISTS (
        SELECT 1 
        FROM current.dmgiuongbenh 
        WHERE COALESCE(madv,'') = COALESCE(r_bnnoitru.madv,'')
          AND COALESCE(ma_giuong,'') = COALESCE(BedNo,'')
          AND COALESCE(mabn,'') != PatientCode
          AND COALESCE(maba,'') != MedicalRecordNo
          AND COALESCE(mabn,'') != ''
          AND COALESCE(maba,'') != ''
    ) THEN
        IF nt_magiuong = '2' THEN
            RETURN jsonb_build_object(
                'status', 'error',
                'message',
                format('Mã giường (BedNo): %s thuộc khoa: %s, đã có người bệnh khác sử dụng!',BedNo,COALESCE(r_bnnoitru.madv,'')
                )
            );
        END IF;
    ELSE
		IF (nt_magiuong = '1' OR nt_magiuong = '2') THEN 
			IsInsertGB = true;
		END IF;
    END IF;
END IF;
        
    IF COALESCE(Infor,'')='' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Diễn biến (Infor): Không thể rỗng. (Mabn: %L, Makb: %L, Maba: %L)', 
            PatientCode, AdmissionCode, MedicalRecordNo)
        );
    END IF;

    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = PatientCode AND makb = AdmissionCode AND maba = MedicalRecordNo AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            PatientCode, AdmissionCode, MedicalRecordNo)
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM current.dmnhanvien
        WHERE manv = TreatmentDoctorCode AND COALESCE(macc_hanhnghe_cv2348,'') != '' AND COALESCE(trangthai,'') = '1'
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', format('TreatmentDoctorCode: %s không tồn tại trong HIS (Điều kiện: Phải có CCHN và trạng thái đang làm việc.)', TreatmentDoctorCode));
    END IF;
    IF input_json ? 'Diagnosis' AND jsonb_array_length(input_json->'Diagnosis') > 0 THEN
        
            /* Gom tất cả ICD code (DiagnosisType=1) rồi kiểm tra một lần */
        WITH dx AS (
            SELECT DISTINCT
                   (d->>'DiagnosisICDCode')::text AS icd_code
            FROM jsonb_array_elements(input_json->'Diagnosis') AS d
            WHERE COALESCE((d->>'DiagnosisType')::int, 0) = 1
              AND NULLIF(d->>'DiagnosisICDCode','') IS NOT NULL
        ),
        missing AS (
            SELECT dx.icd_code
            FROM dx
            LEFT JOIN current.dmicd m
                   ON m.maicd = dx.icd_code AND COALESCE(m.xoa,0)=0
            WHERE m.maicd IS NULL
        )
        SELECT ARRAY_AGG(icd_code)
        INTO missing_icds
        FROM missing;

        IF missing_icds IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 
                format('ICD code (DiagnosisType=1) không tồn tại hoặc ngưng sử dụng trong current.dmicd: %L', missing_icds));
        END IF;

    END IF;

    IF input_json ? 'Diagnosis' AND jsonb_array_length(input_json->'Diagnosis') > 0 THEN
        
            /* Gom tất cả ICD code (DiagnosisType=1) rồi kiểm tra một lần */
        WITH dx AS (
            SELECT DISTINCT
                   (d->>'DiagnosisICDCode')::text AS icd_code
            FROM jsonb_array_elements(input_json->'Diagnosis') AS d
            WHERE COALESCE((d->>'DiagnosisType')::int, 0) = 2
              AND NULLIF(d->>'DiagnosisICDCode','') IS NOT NULL
        ),
        missing AS (
            SELECT dx.icd_code
            FROM dx
            LEFT JOIN current.dmbyt_benhyhct m
                   ON m.ma_yhct = dx.icd_code
            WHERE m.ma_yhct IS NULL
        )
        SELECT ARRAY_AGG(icd_code)
        INTO missing_icds
        FROM missing;

        IF missing_icds IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 
                format('ICD code (DiagnosisType=2) không tồn tại hoặc ngưng sử dụng trong current.dmbyt_benhyhct: %L', missing_icds));
        END IF;

    END IF;

    IF input_json ? 'ParaClinRequests' AND jsonb_array_length(input_json->'ParaClinRequests') > 0 THEN
        
        WITH dx AS (
            SELECT DISTINCT
                   (d->>'MedSerCode')::text AS macls_code
            FROM jsonb_array_elements(input_json->'ParaClinRequests') AS d
            WHERE NULLIF(d->>'MedSerCode','') IS NOT NULL
        ),
        missing AS (
            SELECT dx.macls_code
            FROM dx
            LEFT JOIN current.dmcls m
                   ON m.macls = dx.macls_code AND COALESCE(m.sudung,0)=1 AND COALESCE(m.tt37,0)=1
            WHERE m.macls IS NULL
        )
        SELECT ARRAY_AGG(macls_code)
        INTO missing_icds
        FROM missing;

        IF missing_icds IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 
                format('MedSerCode code không tồn tại hoặc ngưng sử dụng trong current.dmcls: %L', missing_icds));
        END IF;

    END IF;

    SELECT EXISTS (
        SELECT 1 FROM current.qtdieutri WHERE iddienbien = TPCode AND mabn = PatientCode AND makb = AdmissionCode AND maba = MedicalRecordNo
    ) INTO record_exists;

    
    DepartmentCode := input_json->>'DepartmentCode';
    ParaClinicalResultCommand := input_json->>'ParaClinicalResultCommand';
    VitalSignCommand := input_json->>'VitalSignCommand';
    RiskOfFalling := input_json->>'RiskOfFalling';
    TakeCare := input_json->>'TakeCare';
    FollowUpCommand := input_json->>'FollowUpCommand';
    MethodOfTreatmentCommand := input_json->>'PatientCode';
    NutritionCommand := input_json->>'NutritionCommand';
    
    DiseaseName := input_json->>'DiseaseName';
    IsNotChange := (input_json->>'IsNotChange')::BOOLEAN;
    FileDocID := input_json->>'FileDocID';
    FilePath := input_json->>'FilePath';
    SignStatus := (input_json->>'SignStatus')::INT;
    Reason := input_json->>'Reason';
    DiagnosisDesc := input_json->>'DiagnosisDesc';
    DiagnosisICDName := input_json->>'DiagnosisICDName';
    DiagnosisTraditionalDesc := input_json->>'DiagnosisTraditionalDesc';
    DiagnosisOtherDesc := input_json->>'DiagnosisOtherDesc';

    Height := (input_json->'VitalSign'->>'Height')::numeric;
    Weight := (input_json->'VitalSign'->>'Weight')::numeric;
    BMI := (input_json->'VitalSign'->>'BMI')::numeric;
    BloodPressureSystolic := (input_json->'VitalSign'->>'BloodPressureSystolic')::numeric;
    BloodPressureDiastolic := (input_json->'VitalSign'->>'BloodPressureDiastolic')::numeric;
    BodyTemperature := (input_json->'VitalSign'->>'BodyTemperature')::numeric;
    Pulse := (input_json->'VitalSign'->>'Pulse')::numeric;
    BreathBeat := (input_json->'VitalSign'->>'BreathBeat')::numeric;
    SpO2 := (input_json->'VitalSign'->>'SpO2')::numeric;
    Para := (input_json->'VitalSign'->>'Para');
    I_RHType := (input_json->'VitalSign'->>'I_RHType')::numeric;
    I_BloodType := (input_json->'VitalSign'->>'I_BloodType')::numeric;

    nt_huyetap := BloodPressureSystolic || '/' || BloodPressureDiastolic;

    FOR Diagnosis IN SELECT value FROM jsonb_array_elements(COALESCE(input_json->'Diagnosis','[]')) AS value
    LOOP
        IF (Diagnosis->>'DiagnosisType')::INT = 2 THEN
            dt_mayhct := Diagnosis->>'DiagnosisICDCode';
            dt_tenyhct := COALESCE(
                        Diagnosis->>'DiagnosisDesc',
                        NULLIF(TRIM(Diagnosis->>'DiagnosisICDName'), '')                        
                    );
            
        ELSE
            IF (Diagnosis->>'IsMain')::BOOLEAN THEN
                dt_maicd := Diagnosis->>'DiagnosisICDCode';
                dt_kqcdoan := COALESCE(
                        Diagnosis->>'DiagnosisDesc',
                        NULLIF(TRIM(Diagnosis->>'DiagnosisICDName'), '')                        
                    );
                
            ELSE
                dt_maicdp_arr   := array_append(dt_maicdp_arr,   Diagnosis->>'DiagnosisICDCode');
                dt_kqcdoanp_arr := array_append(dt_kqcdoanp_arr, 
                    COALESCE(
                        Diagnosis->>'DiagnosisDesc',
                        NULLIF(TRIM(Diagnosis->>'DiagnosisICDName'), '')                        
                    )
                );				
            END IF;
        END IF;
    END LOOP;
	
    dt_maicdp   := array_to_string(dt_maicdp_arr, ';'); 
    dt_kqcdoanp := array_to_string(dt_kqcdoanp_arr, ';');
    
    
    SELECT giatri INTO thangnam FROM current.system WHERE tents = 'thanglv';
    thangkt_S := SPLIT_PART(thangnam, '/', 1);
    namkt_S := SPLIT_PART(thangnam, '/', 2);

    SELECT maphong, sogiuong INTO nt_maphong, nt_sogiuong -- lấy cho đủ số liệu
    FROM current.bnnoitru
    WHERE mabn = PatientCode AND maba = MedicalRecordNo AND makb = AdmissionCode;
    
    SELECT COALESCE(NULLIF(giatri, ''), '0') AS giatri INTO ma_benh_kt_soluong FROM current.system WHERE tents = 'ma_benh_kt.soluong';
    
    SELECT 
        CASE WHEN TRIM(BOTH ';' FROM string_agg(DISTINCT val, ';')) IS NULL 
                  OR TRIM(BOTH ';' FROM string_agg(DISTINCT val, ';')) = '' 
            THEN '0'
            ELSE TRIM(BOTH ';' FROM string_agg(DISTINCT val, ';')) END,
        COUNT(DISTINCT val),
        CASE WHEN TRIM(BOTH ';' FROM string_agg(DISTINCT val2, ';')) IS NULL 
                  OR TRIM(BOTH ';' FROM string_agg(DISTINCT val2, ';')) = '' 
            THEN '0'
            ELSE TRIM(BOTH ';' FROM string_agg(DISTINCT val2, ';')) END,
        COUNT(DISTINCT val2) 
    INTO icds, icd_count, icds2, icd_count2
    FROM (
        SELECT 
            unnest(string_to_array(maicd || ';' || maicdp, ';')) AS val,
            unnest(string_to_array(maicd || ';' || maicdp, ';')) AS val2
        FROM    current.qtdieutri a
        WHERE   a.mabn = PatientCode
            AND a.maba = MedicalRecordNo
            AND a.makb = AdmissionCode
            AND EXISTS (
                SELECT 1
                FROM current.system s
                WHERE s.tents = 'ma_benh_kt.soluong.noitru'
                    AND COALESCE(NULLIF(s.giatri, ''), '0') <> '1'
            )
        UNION ALL
        SELECT 
            unnest(string_to_array(dt_maicd || ';' || dt_maicdp, ';')) AS val,
            NULL AS val2
    ) tam
    WHERE val <> '';
    
    IF icd_count > ma_benh_kt_soluong + 1 THEN
    	RETURN jsonb_build_object('status', 'error', 'message', 
                format('Số lượng ICD %s vượt quá số lượng cấu hình %s', icd_count,ma_benh_kt_soluong + 1));
    END IF;

    BEGIN
        IF record_exists THEN
            UPDATE current.qtdieutri
            SET manv = TreatmentDoctorCode,
                ngaygio = TPDate,
                dienbien = Infor,
                maicd = dt_maicd,
                kqcdoan = dt_kqcdoan,
                maicdp = dt_maicdp,
                kqcdoanp = dt_kqcdoanp,
                madv = DepartmentCode,
                mayhct = dt_mayhct,
                tenyhct = dt_tenyhct,
                chamsoc = FollowUpCommand,
                maphong = nt_maphong,
                sogiuong = BedNo,
                ma_giuong = BedNo,
                api = 1,
                huyetap = nt_huyetap,
                nhiptho = BreathBeat,
                nhietdo = BodyTemperature,
                mach = Pulse,
                chieucao = Height/100.0,
                cannang = Weight
            WHERE iddienbien = TPCode AND mabn = PatientCode and maba = MedicalRecordNo AND makb = AdmissionCode;
        ELSE
            INSERT INTO current.qtdieutri(
                mabn, makb, maba, manv, ngaygio,
                dienbien, maicd, kqcdoan, maicdp, kqcdoanp,
                madv, iddienbien, mayhct, tenyhct, chamsoc, api, thangkt, namkt, maphong,
                ma_giuong, huyetap, nhiptho, nhietdo, mach, chieucao, cannang, sogiuong
            )
            VALUES (
                PatientCode, AdmissionCode, MedicalRecordNo, TreatmentDoctorCode, TPDate,
                Infor, dt_maicd, dt_kqcdoan, dt_maicdp, dt_kqcdoanp,
                DepartmentCode, TPCode, dt_mayhct, dt_tenyhct, FollowUpCommand, 1, thangkt_S, namkt_S, nt_maphong,
                BedNo, nt_huyetap, BreathBeat, BodyTemperature, Pulse, Height/100.0, Weight, BedNo
            );
        END IF;

        UPDATE current.bnnoitru
            SET manv = TreatmentDoctorCode,
                iddienbien = TPCode,
                ngaykcb = TPDate,
                dienbien = Infor,
                maicd = dt_maicd,
                kqcdoan = dt_kqcdoan,
                maicdp = dt_maicdp,
                kqcdoanp = dt_kqcdoanp,
                mayhct = dt_mayhct,
                tenyhct = dt_tenyhct,
                chamsoc = FollowUpCommand,
                huyetap = nt_huyetap,
                nhiptho = BreathBeat,
                nhietdo = BodyTemperature,
                mach = Pulse,
                chieucao = Height/100.0,
                cannang = Weight,
                maphong = nt_maphong,
                sogiuong = BedNo
            WHERE mabn = PatientCode and maba = MedicalRecordNo AND makb = AdmissionCode;

        UPDATE current.ttcon
            SET manv = TreatmentDoctorCode,
                iddienbien = TPCode,
                maicd = dt_maicd,
                kqcdoan = dt_kqcdoan,
                maicdp = dt_maicdp,
                kqcdoanp = dt_kqcdoanp,
                mayhct = dt_mayhct,
                tenyhct = dt_tenyhct
            WHERE mabnme = PatientCode and mabame = MedicalRecordNo AND COALESCE(loaitt,0) = 1;
		
		IF (IsInsertGB) THEN 
        	UPDATE current.dmgiuongbenh 
                SET mabn = '', maba = ''
            WHERE COALESCE(madv,'') = COALESCE(r_bnnoitru.madv,'')
                AND COALESCE(ma_giuong,'') != COALESCE(BedNo,'')
                AND COALESCE(mabn,'') = PatientCode
                AND COALESCE(maba,'') = MedicalRecordNo;
			UPDATE current.dmgiuongbenh 
				SET mabn = PatientCode, maba = MedicalRecordNo
			WHERE COALESCE(madv,'') = COALESCE(r_bnnoitru.madv,'')
				AND COALESCE(ma_giuong,'') = COALESCE(BedNo,'')
				AND COALESCE(mabn,'') = ''
				AND COALESCE(maba,'') = '';
		END IF;

        IF jsonb_array_length(COALESCE(input_json->'Prescriptions', '[]'::jsonb)) > 0 THEN
            PERFORM badt_dhs.inserttpprescription(input_json);
        END IF;

        IF jsonb_array_length(COALESCE(input_json->'ParaClinRequests', '[]'::jsonb)) > 0 THEN
            PERFORM badt_dhs.insertcutpparaclinrequest(input_json);
        END IF;

        RETURN jsonb_build_object('status', 'success', 'message', '');

    EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            v_err_context = PG_EXCEPTION_CONTEXT,
            v_err_msg = MESSAGE_TEXT;

        RETURN jsonb_build_object(
            'status', 'error',
            'message', v_err_msg
        );
    END;

END;
$$ LANGUAGE plpgsql;


`
  },
  "badt_dhs.GetSyncCityProvince": {
    name: "badt_dhs.GetSyncCityProvince",
    para: ["matinh"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncCityProvince(matinh text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-07-24 11:09:21
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncCityProvince(matinh TEXT DEFAULT NULL)
-- Mô tả: Danh mục tỉnh
--   - Nếu matinh IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu matinh có giá trị cụ thể          => lọc theo matinh
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncCityProvince();        -- Trả toàn bộ tỉnh
--   SELECT badt_dhs.GetSyncCityProvince('');      -- Trả toàn bộ tỉnh
--   SELECT badt_dhs.GetSyncCityProvince('00');   -- Chỉ tỉnh mã '00'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/qYfmhScH/Postman-2-Bv-SJw-Xkic.png)
-- [ÔNG TRIỆU HẬU 2025-07-24] Xử lý lại để không bị trùng khi đưa lên EMR
-- SELECT DISTINCT
--   tinh.matinh AS "CityProvinceCode",          --Mã Tỉnh/Thành
--   tinh.tentinh AS "CityProvinceName",         --Tỉnh/ Thành
--   'VN' AS "CountryCode",  				            --Mã Quốc Gia
--   FALSE AS "IsBlocked"                        --Khoá
-- FROM current.dmxa4750 tinh
-- WHERE  COALESCE(p_matinh,'') = '' OR tinh.matinh = p_matinh
--SELECT badt_dhs.GetSyncCityProvince();
  result text;
  p_matinh ALIAS FOR matinh;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT ON (tinh.matinh)
      tinh.matinh AS "CityProvinceCode",
      tinh.tentinh AS "CityProvinceName",
      'VN' AS "CountryCode",
      FALSE AS "IsBlocked"
    FROM current.dmxa4750 tinh
    WHERE  COALESCE(p_matinh,'') = '' OR tinh.matinh = p_matinh
    ORDER BY tinh.matinh, tinh.loai DESC  -- Ưu tiên loai = 1
  ) AS row_data;
  RETURN result;
END;
$$;
`
  },
  "badt_dhs.GetSyncDistrict": {
    name: "badt_dhs.GetSyncDistrict",
    para: ["mahuyen"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncDistrict(mahuyen text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-07-24 11:09:21
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncDistrict(mahuyen TEXT DEFAULT NULL)
-- Mô tả: Danh mục huyện
--   - Nếu mahuyen IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu mahuyen có giá trị cụ thể          => lọc theo mahuyen
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncDistrict();        -- Trả toàn bộ huyện
--   SELECT badt_dhs.GetSyncDistrict('');      -- Trả toàn bộ huyện
--   SELECT badt_dhs.GetSyncDistrict('00');   -- Chỉ huyện mã '00'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/PGr4VQKF/Postman-pq-GORxn-BEQ.png)
-- [ÔNG TRIỆU HẬU 2025-07-24] - Xử lý lại để không trùng mahuyen
-- SELECT DISTINCT
--   huyen.mahuyen AS "DistrictCode",            --Mã Quận/Huyện
--   huyen.tenhuyen AS "DistrictName",           --Quận/ Huyện
--   huyen.matinh AS "CityProvinceCode",         --Mã Tỉnh/Thành
--   FALSE AS "IsBlocked"                        --Khoá
-- FROM current.dmxa4750 huyen
-- WHERE (COALESCE(p_mahuyen,'') = '' OR huyen.mahuyen = p_mahuyen) AND COALESCE(huyen.mahuyen,'')<>''
--SELECT badt_dhs.GetSyncDistrict();
  result text;
  p_mahuyen ALIAS FOR mahuyen;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
      SELECT DISTINCT ON (huyen.mahuyen)
        huyen.mahuyen AS "DistrictCode",
        huyen.tenhuyen AS "DistrictName",
        huyen.matinh AS "CityProvinceCode",
        FALSE AS "IsBlocked"
      FROM current.dmxa4750 huyen
      WHERE 
        (COALESCE(p_mahuyen, '') = '' OR huyen.mahuyen = p_mahuyen)
        AND COALESCE(huyen.mahuyen, '') <> ''
      ORDER BY huyen.mahuyen, huyen.loai DESC  -- Ưu tiên loai = 1
  ) AS row_data;
  RETURN result;
END;
$$;
`
  },
  "badt_dhs.GetSyncWard": {
    name: "badt_dhs.GetSyncWard",
    para: ["id"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncWard(id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-11-10 15:54:46
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncWard(mahuyen TEXT DEFAULT NULL)
-- Mô tả: Danh mục phuờng xã
--   - Nếu matinh IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu matinh có giá trị cụ thể          => lọc theo matinh
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncWard();        -- Trả toàn bộ tỉnh
--   SELECT badt_dhs.GetSyncWard('');      -- Trả toàn bộ tỉnh
--   SELECT badt_dhs.GetSyncWard('00');   -- Chỉ tỉnh mã '00'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/Xk280WFT/iq84-F06-Shk.png)
--https://storage.googleapis.com/calf-sure-sawfly.appspot.com/2025/11/10/DESKTOP-2FLMTI6-sidekick-2025-11-10-10h34p27.101.png
  result text;
  p_id ALIAS FOR id;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT 
      xa.maxa AS "WardCode",           --Mã Phường/ Xã
      xa.tenxa AS "WardName",          --Phường/ Xã
      xa.mahuyen AS "DistrictCode",    --Mã Quận/Huyện
      xa.matinh AS "CityProvinceCode",    --Mã Tỉnh [ÔNG TRIỆU HẬU - 2025-07-30] ![](https://live.staticflickr.com/65535/54689198738_253f510d41_b.jpg)
      FALSE AS "IsBlocked",             --Khoá
      xa.id AS "MappingCode"            --[ÔNG TRIỆU HẬU: 2025-11-10] Thêm trường này để chuẩn hóa địa chỉ 2 cấp
    FROM current.dmxa4750 xa
    WHERE (COALESCE(p_id,'') = '' OR xa.id = p_id) AND COALESCE(xa.id,'')<>''
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.getCUTPPrescription": {
    name: "badt_dhs.getCUTPPrescription",
    para: ["mabn","maba","makb","sohd"],
    returns: "text",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.getCUTPPrescription(mabn text, maba text, makb text, sohd text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-08-18 08:46:15
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
--[ÔNG TRIỆU HẬU - 2027-07-28: Xử lý để dùng đối với BANT]
--[ÔNG TRIỆU HẬU - 2027-07-30: Xử lý để dùng đối với BANT theo đợt và ngày]
--[ÔNG TRIỆU HẬU - 2027-07-28: Xử lý để dùng đối với BANT]
--[ÔNG TRIỆU HẬU - 2027-07-30: Xử lý để dùng đối với BANT theo đợt và ngày]
-- nên phải dùng TPCode chỗ này, Và truyền số chứng từ này vào chi tiết 
-- cộng với mã hàng hóa, khi xóa thì phải xóa chi tiết từng mặt hàng theo chứng từ
-- ![](https://live.staticflickr.com/65535/54609890512_3355c32cc9_b.jpg)
-- 2025-06-28: Chuyển về số HD theo https://docs.google.com/document/d/1HNY0HGCnMdV4Q_gdjZFaqV4qEHl2aCr5r__B98lF8wo/edit?tab=t.0#heading=h.kbfnrnqivgou
-- ![](https://live.staticflickr.com/65535/54619198014_515bd45738_b.jpg)
--Bổ sung thêm cột xóa làm mã chính trên EMR, 
--trường hợp chỉnh chứng từ, HIS giữ lại số chứng từ cũ, nên không làm mã chính để thao tác với EMR được.
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
    'Prescriptions', json_agg(
                 json_build_object(
                 'OrderNo', OrderNo, --số thứ tự
                 'PresDtlCode', PresDtlCode, --=> [ÔNG TRIỆU HẬU]--Bổ sung chi tiết để xử lý, giá trị lấy sohd||mahh
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

`
  },
  "badt_dhs.insertTPPrescription": {
    name: "badt_dhs.insertTPPrescription",
    para: ["input_json"],
    returns: "JSONB",
    codesql: `


CREATE TABLE IF NOT EXISTS badt_dhs.insert_log (
    id SERIAL PRIMARY KEY,
    tpc_code TEXT,             -- Mã tờ điều trị (iddienbien)
    patient_code TEXT,         -- Mã bệnh nhân
    admission_code TEXT,       -- Mã tiếp nhận
    error_message TEXT,        -- Nội dung lỗi
    error_detail TEXT,         -- Chi tiết lỗi nếu cần
    log_time TIMESTAMP DEFAULT now(), -- Thời gian lỗi
    raw_json JSONB             -- Dữ liệu đầu vào
);

CREATE OR REPLACE FUNCTION badt_dhs.insertTPPrescription(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
-- Lastest commit: author:Nguyễn Triều Vương; date: 2026-03-30 15:08:29
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-06-10
-- Hàm: badt_dhs.insertTPPrescription(input_json JSONB)
-- Mô tả:
--   - input_json: nội dung file json được get về từ ...
-- Sử dụng:
--   SELECT badt_dhs.insertTPPrescription(input_json JSONB);  --Insert,update vào current.chungtu, current.pshdxn, current.pstonkho từ DHS
-- ===============================================================
--json mẫu
-- ===============================================================
-- Tạo bảng ghi log lỗi
--================================================================
--ngay_uong INT := COALESCE((input_json->>'DatOfUse')::NUMERIC, 0);
--voucherdate TIMESTAMP:= input_json->>'VoucherDate'; --VoucherDate: Ngày phiếu thuốc. => ngayhd
-- Biến kiểm tra ICD
--[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
-- Kiểm tra IDDienBien
--RETURN FALSE;
--[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra tồn tại mahh
--[ÔNG TRIỆU HẬU: 2025-09-18]
-- Kiểm tra thêm StoreHouse SELECT khocp INTO khocp_dt FROM current.dmkhocp WHERE loai = 2 AND dongy = 1 LIMIT 1;
--                    và SELECT khocp INTO khocp_dt FROM current.dmdoituongkhocp WHERE madt= madt_nt and (noitru = 1 or noitru = 2) ORDER BY noitru LIMIT 1
-- Kiểm tra thêm Matutru
-- SELECT array_agg(madv)::TEXT[] INTO kho_tutruc
-- FROM current.dmdonvi
-- WHERE loaidv = 3 AND COALESCE(vietngan, '') = madv_nt;
--
-- lấy pcchandoan
--[ntvuong: 2025-10-03] Kiểm tra thông tin thẻ 2
--Lấy thông tin thẻ bh2
--
-- Lấy madt
-- Lấy ngày giờ diễn biến
-- Lấy ngày uống: Fix ngày uống toa xuất viện
--Lấy tài khoản bs
-- Lấy tháng/năm kế toán
--[Vương-01-10-2025]
--Kiểm tra ngày có thuộc tháng kế toán hay không
--VoucherDate
--Ngaylap
--Kiểm tra toa đã tổng hợp, đã thu chưa
-- Kiểm tra trùng chứng từ
-- Gọi hàm xóa toa
-- Duyệt qua từng thuốc trong đơn
-- Kiểm tra tất cả thuốc trong toa còn đủ xuất thì mới tiến hành xuất thuốc
-- Cách 4: Sử dụng %L thay cho %s (để xử lý NULL an toàn hơn)
--   soluong := COALESCE((pres_item->>'OriDispenseQty')::NUMERIC, 0);
-- [ÔNG TRIỆU HẬU - 2025-08-13] Chỉnh lại lấy cột số lượng đúng theo qui ước EMR ![](https://live.staticflickr.com/65535/54716976562_f6fef58c7f_b.jpg)
--Lây khochan
-- Lặp qua các lô tồn kho còn hạn dùng
--[ÔNG TRIỆU HẬU - 2025-08-16]: Chỉnh lại lấy giá xuất trong pstonkho để không lỗi tính toán tồn kho (có trong pshdxn mà không có trong pstonkho)
-- đang bị vướng ở Hồng Dân - Bạc Liêu ![](https://live.staticflickr.com/65535/54724059876_4da9e010a5_b.jpg)
-- In dữ liệu từng dòng để kiểm tra
-- IN số lượng còn lại
--sl_lay NUMERIC := soluong;
--sl_lay NUMERIC := LEAST(so_con_lai, r_stock.toncuoi);
-- Ghi chi tiết vào pshdxh (mỗi lô 1 dòng)
-- Cập nhật tồn kho
--[ÔNG TRIỆU HẬU - 2025-09-09]: Chỉnh lỗi cập nhật giá trị bị sai, đối với kho, khi đưa vào xử lý chung với tủ trực pstonkho_check_toncuoi_dh_chk3
-- Cộng vào tổng
--[ÔNG TRIỆU HẬU - 2025-08-16]: Chỉnh lại tính thành tiền theo sl_lay
--   tong_thanhtien := tong_thanhtien + (r_stock.giaxuat * soluong);
--   tong_thanhtienbhyt := tong_thanhtienbhyt + (r_stock.giabhyt * soluong);
--   tong_thanhtienvat := tong_thanhtienvat + (r_stock.giavat * soluong);
-- In dữ liệu từng dòng để kiểm tra
-- Trừ số còn lại
-- Nếu vẫn còn thiếu thuốc, ghi log lỗi
--RETURN FALSE;
-- Chèn 1 dòng tổng vào CHUNGTU
--Lấy chẩn đoán chứng từ
--[ÔNG TRIỆU HẬU - 2025-08-16]: Dời ra ngoài để hứng toàn bộ Exception đồng thời ghi nhận log
--[ÔNG TRIỆU HẬU - 2025-08-16]: Gom xử lý lại lỗi, và ghi nhận log để theo dõi.
    TPCode TEXT := input_json->>'TPCode'; --mã tờ điều trị: iddienbien
    AdmissionCode TEXT := input_json->>'AdmissionCode'; --makb
    MedicalRecordNo TEXT := input_json->>'MedicalRecordNo'; -- maba
    PatientCode TEXT := input_json->>'PatientCode'; --mabn
    EmployeeCode TEXT := input_json->>'EmployeeCode'; --manv
    TreatmentDoctorCode TEXT:= input_json->>'TreatmentDoctorCode'; --manv: chỉ định diễn biến
    PresCode TEXT := input_json->>'PresCode'; --sohd
    ngay TIMESTAMP:= input_json->>'Ngay';
    voucherdate_text TEXT:= input_json->>'VoucherDate'; --VoucherDate: Ngày phiếu thuốc. => ngayhd
    isdischarge BOOLEAN:= input_json->>'IsDischarge'; -->> TRUE: Toa xuất viện, FALSE: toa bình thường
    IsHI_CT BOOLEAN:= input_json->>'IsHI'; -->> TRUE: Toa BH, FALSE: TOA TP
    strtoamo TEXT := CASE WHEN COALESCE(lower(input_json->>'IsToaMo'), '') = 'true' THEN 'TMO' ELSE '' END;

    madt_nt TEXT; -- mã đối tượng, lấy cho đủ số liệu, toa thuốc mới lên module
    madv_nt TEXT; -- mã khoa, lấy cho đủ số liệu, toa thuốc mới lên module
    maicd_nt TEXT; --maicd, lấy cho đủ số liệu, toa thuốc mới lên module
    kqcdoan_nt TEXT;--kqcdoan, lấy cho đủ số liệu, toa thuốc mới lên module
    maicdp_nt TEXT; --maicdp , lấy cho đủ số liệu, toa thuốc mới lên module
    kqcdoanp_nt TEXT;--kqcdoanp , lấy cho đủ số liệu, toa thuốc mới lên module

    mayhct_nt TEXT; --mayhct
    tenyhct_nt TEXT;--tenyhct
    pcchandoan TEXT := ';';
    chandoan_ct TEXT;
    cdoan TEXT := '';
    cdoanp TEXT := '';

    thangnam TEXT;
    thangkt_S TEXT; -- thangkt, lấy cho đủ số liệu, toa thuốc mới lên module
    namkt_S TEXT; --namkt, lấy cho đủ số liệu, toa thuốc mới lên module

    ngayhd DATE;
    ngaylap DATE;
    giolap TIMESTAMP;
	giolap_hd TIMESTAMP;
    toaxv NUMERIC := 0;


    pres JSONB;
    pres_item JSONB;
    idx INT;
    soluong NUMERIC;
    ngay_uong INT:= 0;
    sang NUMERIC := 0;
    trua NUMERIC := 0;
    chieu NUMERIC := 0;
    toi NUMERIC := 0;
    lieu_dung TEXT;
    cachuong TEXT;
    inv_code TEXT; --sohd
    khoCode TEXT; --khole
    khochan_ct TEXT; --khochan
    so_con_lai NUMERIC;
    tong_thanhtien NUMERIC := 0;
    tong_thanhtienbhyt NUMERIC := 0;
    tong_thanhtienvat NUMERIC := 0;
    loaitoa_ct NUMERIC := 0;
    noitru_nt NUMERIC := 1; --noitru, lấy cho đủ số liệu, toa thuốc mới lên module
    loaixn_nt TEXT := 'xbb'; --loaixn, lấy cho đủ số liệu, toa thuốc mới lên module

    taikhoan_nt TEXT;--taikhoan: lập phiếu
    manv_nt TEXT;--manv: lập phiếu
    mathe_nt TEXT;--manv: lập phiếu

    db_ngaygio TIMESTAMP;
    r_stock RECORD;
    stt_nt INT;
    pres_success BOOLEAN := TRUE;
    ct_thanhtoan TEXT := ''; --'': Toa BH, '1': Toa thu phí
    ishi BOOLEAN := TRUE; -->> TRUE: Toa BHYT, FALSE: Toa thu phí

    toncuoi_ps NUMERIC:= 0;
    Matutruc TEXT:= ''; --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
    dain NUMERIC:= 0;

    missing_icds TEXT[];
    r_bnnoitru RECORD;
    r_ttcon RECORD;
    so_ngay NUMERIC := 0;
    ma_con TEXT;
    toa_con NUMERIC := 0;
	r_canhbao RECORD;
	r_ketqua RECORD;
	text_canhbao TEXT := '';
    text_dieukien  TEXT := '';
    text_sql  TEXT := '';
BEGIN

    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = PatientCode AND maba = MedicalRecordNo AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message',
            format('Mabn: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)',
            PatientCode, MedicalRecordNo)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM current.qtdieutri WHERE iddienbien = TPCode) THEN
      INSERT INTO badt_dhs.insert_log(tpc_code, patient_code, admission_code,
                                      error_message, error_detail, raw_json)
      VALUES (TPCode, PatientCode, AdmissionCode,
              'Không tìm thấy IDdienbien', format('TPCode %s không tồn tại trong qtdieutri', TPCode), input_json);
      		  pres_success := FALSE;
              RETURN jsonb_build_object(
                  'status', 'error',
                  'message', format('IDdienbien %s không tồn tại', TPCode)
              );
   END IF;

  IF input_json ? 'Prescriptions' AND jsonb_array_length(input_json->'Prescriptions') > 0 THEN

      WITH dx AS (
          SELECT DISTINCT
                 (d->>'InventoryCode')::text AS mahh_code
          FROM jsonb_array_elements(input_json->'Prescriptions') AS d
          WHERE NULLIF(d->>'InventoryCode','') IS NOT NULL
      ),
      missing AS (
          SELECT dx.mahh_code
          FROM dx
          LEFT JOIN current.dmthuoc m
                 ON m.mahh = dx.mahh_code AND COALESCE(m.xoa,0)=0
          WHERE m.mahh IS NULL
      )
      SELECT ARRAY_AGG(mahh_code)
      INTO missing_icds
      FROM missing;

      IF missing_icds IS NOT NULL THEN
          RETURN jsonb_build_object('status', 'error', 'message',
              format('InventoryCode code không tồn tại hoặc ngưng sử dụng trong current.dmthuoc: %L', missing_icds));
      END IF;



  END IF;

    SELECT giatri INTO pcchandoan from current.system where tents = 'pcchandoan';
    SELECT *,
       CASE WHEN length(mathe) > 10 THEN substring(mathe from 3 for 1) ELSE NULL END AS maql
    INTO r_ttcon
    FROM current.ttcon
    WHERE mabnme = PatientCode
        AND mabame = MedicalRecordNo
        AND COALESCE(loaitt,0) = 1;
    SELECT *,
       CASE WHEN length(mathe) > 10 THEN substring(mathe from 3 for 1) ELSE NULL END AS maql
    INTO r_bnnoitru
    FROM current.bnnoitru
    WHERE mabn = PatientCode
    	AND maba = MedicalRecordNo
        AND makb = AdmissionCode;
        
    madv_nt = r_bnnoitru.madv;
    
    IF COALESCE(r_ttcon.maba,'') <> '' THEN
    	madt_nt = r_ttcon.madt;
        maicd_nt = r_ttcon.maicd;
        kqcdoan_nt = r_ttcon.kqcdoan;
        maicdp_nt = r_ttcon.maicdp;
        kqcdoanp_nt = r_ttcon.kqcdoanp;
        mathe_nt = r_ttcon.mathe;
        mayhct_nt = r_ttcon.mayhct;
        tenyhct_nt = r_ttcon.tenyhct;
        ma_con = r_ttcon.maba;
        toa_con = 2;
    ELSE
    	madt_nt = r_bnnoitru.madt;
        madv_nt = r_bnnoitru.madv;
        maicd_nt = r_bnnoitru.maicd;
        kqcdoan_nt = r_bnnoitru.kqcdoan;
        maicdp_nt = r_bnnoitru.maicdp;
        kqcdoanp_nt = r_bnnoitru.kqcdoanp;
        mathe_nt = r_bnnoitru.mathe;
        mayhct_nt = r_bnnoitru.mayhct;
        tenyhct_nt = r_bnnoitru.tenyhct;
        ma_con = '';
        toa_con = 0;
    END IF;

    /*
    SELECT madt, madv, maicd, kqcdoan, maicdp, kqcdoanp, mathe, mayhct, tenyhct
    INTO madt_nt, madv_nt, maicd_nt, kqcdoan_nt, maicdp_nt, kqcdoanp_nt, mathe_nt, mayhct_nt, tenyhct_nt -- lấy cho đủ số liệu
    FROM current.bnnoitru
    WHERE mabn = PatientCode AND maba = MedicalRecordNo AND makb = AdmissionCode;
    */
    /*
    SELECT ngaygio INTO db_ngaygio
    FROM current.qtdieutri
    WHERE iddienbien = TPCode;
    */
    ngayhd := CASE WHEN voucherdate_text = '' THEN ngay::DATE ELSE voucherdate_text::DATE END; --Vuong chỉnh 05/08/2025
    toaxv := CASE WHEN isdischarge::BOOLEAN = FALSE THEN 0 ELSE 1 END; --Toa xuất viện
    ngaylap := ngay::DATE;
    giolap := CASE WHEN voucherdate_text = '' THEN ngay::TIMESTAMP ELSE voucherdate_text::TIMESTAMP END; --Vuong chỉnh 06/08/2025
	giolap_hd := giolap;
    ngay_uong := CASE WHEN COALESCE(input_json->>'DateOfUse', '') = '' THEN '0' ELSE input_json->>'DateOfUse' END::INT;
    SELECT taikhoan, manv INTO taikhoan_nt, manv_nt
    FROM current.dmnhanvien
    WHERE manv = EmployeeCode OR manv = TreatmentDoctorCode;

    IF COALESCE(taikhoan_nt,'') = '' THEN
    	pres_success := FALSE;
        RAISE EXCEPTION 'Không tìm Thông tin nhân viên thực hiện (EmployeeCode: %, TreatmentDoctorCode: %)', EmployeeCode, TreatmentDoctorCode;
        RETURN jsonb_build_object(
                  'status', 'error',
                  'message', format('Không tìm Thông tin nhân viên thực hiện (EmployeeCode: %L, TreatmentDoctorCode: %L)', EmployeeCode, TreatmentDoctorCode)
              );
    END IF;

    IF madt_nt IS NULL THEN
    	pres_success := FALSE;
        RAISE EXCEPTION 'Không tìm thấy mã điều trị';
        RETURN jsonb_build_object(
                  'status', 'error',
                  'message', format('Không tìm thấy bệnh nhân %s', PatientCode)
              );
    END IF;

    SELECT giatri INTO thangnam FROM current.system WHERE tents = 'thanglv';
    thangkt_S := SPLIT_PART(thangnam, '/', 1);
    namkt_S := SPLIT_PART(thangnam, '/', 2);

    IF NOT EXISTS (
        SELECT 1 FROM current.thangkt
        WHERE thangkt = thangkt_S
             AND namkt = namkt_S
             AND ngayhd::DATE BETWEEN ngaybd::DATE AND ngaykt::DATE
    ) THEN
        RETURN json_build_object(
            'status', 'error',
            'message', format('VoucherDate/Ngay: %s không thuộc tháng kế toán %s/%s.',ngayhd,thangkt_S,namkt_S)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM current.thangkt
        WHERE thangkt = thangkt_S
             AND namkt = namkt_S
             AND ngaylap::DATE BETWEEN ngaybd::DATE AND ngaykt::DATE
    ) THEN
        RETURN json_build_object(
            'status', 'error',
            'message', format('Ngay: %s không thuộc tháng kế toán %s/%s.',ngaylap,thangkt_S,namkt_S)
            );
    END IF;

    IF EXISTS ( SELECT 1 FROM current.chungtu ct WHERE mabn = PatientCode AND makh = MedicalRecordNo  AND iddienbien = TPCode AND sohd = PresCode AND COALESCE(ct.xoa,0) = 0 AND (COALESCE(ct.dain,0) = 1 OR COALESCE(ct.dathu,0) = 1)) THEN
        RETURN json_build_object(
            'status', 'error',
            'message', format('Chứng từ %s đã tồn tại và đã phát thuốc hoặc thu tiền.',PresCode)
        );
    END IF;
    IF EXISTS (SELECT 1 FROM current.chungtu WHERE sohd = PresCode AND mabn = PatientCode AND makh = MedicalRecordNo AND iddienbien = TPCode) THEN
      PERFORM badt_dhs.deletetpprescription(input_json);
    END IF;

    pres := input_json->'Prescriptions';
    RAISE NOTICE 'Ngày uống 1: %',
                  ngay_uong;
    FOR idx IN 0 .. jsonb_array_length(pres) - 1 LOOP
      pres_item := pres->idx;
      inv_code := COALESCE(pres_item->>'InventoryCode','');
      khoCode := COALESCE(pres_item->>'StoreHouse','');
      Matutruc := COALESCE(pres_item->>'Matutruc','');

      IF khoCode<>'' AND Matutruc<>'' THEN
        pres_success := FALSE;
        RETURN jsonb_build_object(
            'status', 'error',
            'message', format('StoreHouse=%L và Matutruc=%L Không thể đồng thời khác rỗng.', khoCode, Matutruc)
        );
      END IF;

      RAISE NOTICE 'khoCode: %, Matutruc:%', khoCode, Matutruc;
      IF khoCode='' AND Matutruc<>'' THEN
        SELECT khocp INTO khoCode FROM current.dmdonvi WHERE COALESCE(madv,'')=Matutruc AND COALESCE(loaidv,0)=3;
        dain=1;
      END IF;

      soluong := COALESCE((pres_item->>'DispenseQty')::NUMERIC, 0);
      toncuoi_ps := 0;
      SELECT khocpc INTO khochan_ct FROM current.dmkhocp WHERE khocp = khoCode;

      RAISE NOTICE 'khoCode: %, Matutruc:%, khochan_ct: %', khoCode, Matutruc, khochan_ct;

      SELECT SUM(COALESCE(tk.toncuoi,0) - COALESCE(tk.tamxuat,0)) as ps_toncuoi INTO toncuoi_ps
      FROM current.pstonkho tk
      WHERE tk.mahh = inv_code
          AND CASE WHEN Matutruc<>'' THEN tk.madv = Matutruc  ELSE tk.khocp = khoCode END --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
          AND tk.thangkt = thangkt_S
          AND tk.namkt = namkt_S
          AND COALESCE(tk.xoa, 0) = 0 ;

      IF toncuoi_ps < soluong THEN
         pres_success := FALSE;
         INSERT INTO badt_dhs.insert_log(tpc_code, patient_code, admission_code,
                                          error_message, error_detail, raw_json)
          VALUES(TPCode, PatientCode, AdmissionCode,
                 format('Số lượng thuốc %s: tồn kho %s không đủ xuất', inv_code, toncuoi_ps), '', input_json);
          RETURN jsonb_build_object(
                'status', 'error',
                'message', format('Số lượng thuốc %s: tồn kho %s không đủ xuất', inv_code,toncuoi_ps));
      END IF;
   END LOOP;

   /*
   	[2025-11-18]: Fix lỗi isHI = true --> ghi nhận mã đối tượng là TP
   */
    IF IsHI_CT THEN --Vương chỉnh 10-11-2025: Fix lỗi vừa check Toa thu phí và vừa check TMO
       ct_thanhtoan := '';
       loaitoa_ct = 1; --BH;
    ELSE
      ct_thanhtoan := '1';
      madt_nt      := '06';
      loaitoa_ct = 0; --TP;
    END IF;
    /*
   	[NTV 2026-02-06]: Cảnh báo trùng thời gian toa thuốc của nhiều BN
   */
    SELECT
    split_part(x, ':', 2)::int AS canhbao,
    split_part(y, ':', 2)::int AS sophut,
    split_part(z, ':', 2)::int AS loaitoa
	INTO r_canhbao
	FROM (
		SELECT
			split_part(giatri, '|', 1) AS x,
			split_part(giatri, '|', 2) AS y,
			split_part(giatri, '|', 3) AS z
		FROM (SELECT giatri FROM current.system WHERE tents  = 'toathuoc.thoigianratoa') t
	) t2 ;
    IF r_canhbao.canhbao > 0 THEN 			  
		
    	IF r_canhbao.loaitoa = 0 THEN
            text_dieukien := '';
        END IF;

        IF r_canhbao.loaitoa = 1 AND IsHI_CT THEN
            text_dieukien := ' AND COALESCE(ct.thanhtoan, '''') = '''' ';
        END IF;

        IF r_canhbao.loaitoa = 2 AND IsHI_CT = false THEN
            text_dieukien := ' AND COALESCE(ct.thanhtoan, '''') = ''1'' ';
        END IF;
		
        SELECT
            string_agg(
                '- Số hóa đơn: ' || ct.sohd
                || ', ngày giờ lập: ' || to_char(ct.giolap, 'DD/MM/YYYY HH24:MI')
                || ', cách: ' || abs(
                    ROUND(
                        EXTRACT(EPOCH FROM (ct.giolap - giolap_hd::timestamp)) / 60
                    )::int
                ) || ' phút',
                E'\n'
                ORDER BY ct.giolap
            ) AS ketqua
        INTO r_ketqua
        FROM current.chungtu ct
        WHERE ct.manv = EmployeeCode
          AND ct.loaixn = 'xbb'
          AND COALESCE(ct.xoa, 0) = 0
          AND ct.thangkt = thangkt_S
          AND ct.namkt = namkt_S
          AND ct.sohd != PresCode || text_dieukien 
          AND EXTRACT(EPOCH FROM (ct.giolap - giolap_hd::timestamp)) / 60 BETWEEN -r_canhbao.sophut AND r_canhbao.sophut;
          
          IF r_canhbao.canhbao > 0 AND r_ketqua.ketqua <> '' THEN 
			IF r_canhbao.canhbao = 1 THEN
				text_canhbao = r_ketqua.ketqua;
			ELSE
			RETURN jsonb_build_object(
						'status', 'error',
						'message', format(r_ketqua.ketqua)
					);
			END IF;
		END IF;
	END IF;
	
    IF pres_success THEN
      FOR idx IN 0 .. jsonb_array_length(pres) - 1 LOOP
        pres_item := pres->idx;
        ishi := COALESCE((pres_item->>'IsHI')::boolean, true); --True: Toa BH, False: Toa thu phí
        inv_code := pres_item->>'InventoryCode';
        khoCode := COALESCE(pres_item->>'StoreHouse','');
        Matutruc := COALESCE(pres_item->>'Matutruc','');

        RAISE NOTICE 'khoCode: %, Matutruc:%', khoCode, Matutruc;
        IF khoCode='' AND Matutruc<>'' THEN
            SELECT khocp INTO khoCode FROM current.dmdonvi WHERE COALESCE(madv,'')=Matutruc AND COALESCE(loaidv,0)=3;
            SELECT khocpc INTO khochan_ct FROM current.dmkhocp WHERE khocp = khoCode;
            dain=1;
        END IF;

          soluong := COALESCE((pres_item->>'DispenseQty')::NUMERIC, 0); -- Đổi từ OriDispenseQty --> DispenseQty
          so_con_lai := soluong;
          stt_nt := COALESCE((pres_item->>'OrderNo')::INT, idx + 1);

          sang := COALESCE((pres_item->>'MorningQty')::NUMERIC, 0);
          trua := COALESCE((pres_item->>'MiddayQty')::NUMERIC, 0);
          chieu := COALESCE((pres_item->>'AfternoonQty')::NUMERIC, 0);
          toi := COALESCE((pres_item->>'EveningQty')::NUMERIC, 0);

          lieu_dung := pres_item->>'Sudung';
          cachuong := pres_item->>'Cachuong';

          FOR r_stock IN
              SELECT    tk.mahh, tk.handung, tk.solo, tk.visa, COALESCE(tk.toncuoi,0) - COALESCE(tk.tamxuat,0) as toncuoi,
                        tk.giavat, tk.giaxuat, tk.giabhyt, k.bhyt, tk.khocp, tk.madv --[Nguyễn Triều Vương 2025-12-10]: lấy cột giabhyt từ pstonkho để khớp với cách lấy của HIS
              FROM current.pstonkho tk
              JOIN current.dmkho k ON tk.mahh = k.mahh
              WHERE tk.mahh = inv_code
                AND CASE WHEN Matutruc<>'' THEN tk.madv = Matutruc ELSE tk.khocp = khoCode END --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
                AND tk.thangkt = thangkt_S
                AND tk.namkt = namkt_S
                AND COALESCE(tk.xoa, 0) = 0
		        AND COALESCE(tk.uutien, '') != '2' --2: Cấm xuất
                AND COALESCE(tk.toncuoi,0) > 0
                AND COALESCE(tk.toncuoi,0) - COALESCE(tk.tamxuat,0) > 0
              ORDER BY tk.uutien ASC, tk.handung DESC

          LOOP
              RAISE NOTICE 'Lô: %, Hạn dùng: %, SL tồn: %, Giá xuất: %, khocp: %, madv: %',
                  r_stock.solo, r_stock.handung, r_stock.toncuoi, r_stock.giaxuat, r_stock.khocp, r_stock.madv;
              RAISE NOTICE 'SL: %',
                  soluong;

              DECLARE
                sl_lay NUMERIC := LEAST(so_con_lai, r_stock.toncuoi);

              BEGIN
                  RAISE NOTICE '--SỐ Lượng lấy: %',sl_lay;
                  IF pres_success AND sl_lay > 0 THEN
                      INSERT INTO current.pshdxn(
                          sohd, iddienbien, mabn, makh,
                          mahh, ngayhd, ngaylap, giolap, madv,
                          soluong, sang, trua, chieu, toi, lieu_dung, cachuong,
                          giaban, giavat,giabhyt, thanhtien, thanhtienbhyt, bhyt,
                          handung, solo, visa, thangkt, namkt,
                          stt, loaixn,noitru,khole, toaxv,
                          madt, khochan,theodon,tienvat,tenmay,loaitoa,thanhtoan,
                          dain,toatutruc,tutruc,macon, toacon, kyhieu
                      ) --them 06/08/2025
                      VALUES (
                          PresCode, tpcode, PatientCode, MedicalRecordNo,
                          inv_code, ngayhd, ngaylap, giolap, madv_nt,
                          sl_lay, sang, trua, chieu, toi, lieu_dung, cachuong,
                          r_stock.giaxuat, r_stock.giavat, r_stock.giabhyt, r_stock.giaxuat * sl_lay, r_stock.giabhyt * sl_lay, r_stock.bhyt,
                          r_stock.handung, r_stock.solo, r_stock.visa, thangkt_S, namkt_S,
                          stt_nt,loaixn_nt,noitru_nt,khoCode, toaxv,
                          madt_nt,khochan_ct,sl_lay,r_stock.giavat * sl_lay,'',loaitoa_ct, ct_thanhtoan, --thêm 06/08/2025
                          dain, CASE WHEN dain=0 THEN 0 ELSE 1 END, Matutruc,ma_con,toa_con, strtoamo  --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
                      );

                      RAISE NOTICE 'Tồn kho mahh: %, khocp: %, Giá vat: %, HD: %, số lô:%, sl_lay: %',
                          inv_code, khoCode, r_stock.giavat, r_stock.handung, r_stock.solo, sl_lay;

                      UPDATE current.pstonkho
                      SET
                        tamxuat = COALESCE(tamxuat, 0) + (CASE WHEN Matutruc<>'' THEN 0 ELSE COALESCE(sl_lay,0) END) ,
                        toncuoi = COALESCE(toncuoi, 0) - (CASE WHEN Matutruc<>'' THEN COALESCE(sl_lay,0) ELSE 0 END),
                        xuat = COALESCE(xuat, 0) + (CASE WHEN Matutruc<>'' THEN COALESCE(sl_lay,0) ELSE 0 END)
                      WHERE COALESCE(mahh,'') = COALESCE(inv_code,'')
                        AND COALESCE(giavat,0) = COALESCE(r_stock.giavat,0)
                        AND CASE WHEN Matutruc<>'' THEN madv = Matutruc ELSE COALESCE(khocp,'') = COALESCE(khoCode,'') END
                        AND COALESCE(handung,'') = COALESCE(r_stock.handung,'')
                        AND COALESCE(solo,'') = COALESCE(r_stock.solo,'')
			                  AND COALESCE(thangkt,'') = COALESCE(thangkt_S,'')
                        AND COALESCE(namkt,'') = COALESCE(namkt_S,'');

                      RAISE NOTICE '--Tính tổng';
                        tong_thanhtien     := tong_thanhtien     + (r_stock.giaxuat * sl_lay);
                        tong_thanhtienbhyt := tong_thanhtienbhyt + (r_stock.giabhyt * sl_lay);
                        tong_thanhtienvat  := tong_thanhtienvat  + (r_stock.giavat  * sl_lay);

                      RAISE NOTICE 'Tổng thành tiền: %, Giá xuất: %, SL: %, SL còn lại: %',
                          tong_thanhtien, r_stock.giaxuat, soluong, so_con_lai;
                      so_con_lai := so_con_lai - sl_lay;
                      RAISE NOTICE '--Cập nhật thành công';
                  END IF;
              END;
          END LOOP;

          IF so_con_lai > 0 THEN
              pres_success := FALSE;
              INSERT INTO badt_dhs.insert_log(tpc_code, patient_code, admission_code,
                                              error_message, error_detail, raw_json)
              VALUES(TPCode, PatientCode, AdmissionCode,
                     format('Không đủ thuốc %s: thiếu %s đơn vị', inv_code, so_con_lai), '', input_json);
              RETURN jsonb_build_object(
                    'status', 'error',
                    'message', format('Không đủ thuốc %s: thiếu %s đơn vị', inv_code,so_con_lai)
                );
          END IF;
      END LOOP;
    END IF;

	BEGIN
    	IF pres_success THEN
          IF tenyhct_nt != '' THEN
                cdoan := tenyhct_nt || ' [' || kqcdoan_nt || ']';
                cdoanp := CASE WHEN kqcdoanp_nt = '' THEN '' ELSE pcchandoan || kqcdoanp_nt END;
                chandoan_ct := cdoan || cdoanp;
          ELSE
            cdoan := kqcdoan_nt;
            cdoanp := CASE WHEN kqcdoanp_nt = '' THEN '' ELSE pcchandoan || kqcdoanp_nt END;
            chandoan_ct := cdoan || cdoanp;
          END IF;
          RAISE NOTICE 'Chứng từ ngày uống: %',
                          ngay_uong;
          INSERT INTO current.chungtu(
            sohd, iddienbien, mabn, makh, madt, madv,
            manv, ngayuong, ghichu, khole,
            ngayhd, ngaylap, giolap, thanhtien, thangkt, namkt,
            loaixn,noitru, taikhoan, maicd, kqcdoan, maicdp, kqcdoanp, api, thanhtoan, toaxv,
            khochan,tienvat,tenmay,taikham,loaitoa,mathe,thanhtienbhyt,mayhct, tenyhct,
            dain,toatutruc,tutruc,macon, toacon, kyhieu
        ) --them 06/08/2025
          VALUES (
              PresCode, tpcode, PatientCode, MedicalRecordNo, madt_nt, madv_nt,
              manv_nt, ngay_uong, '', khoCode,
              ngayhd, ngaylap, giolap, tong_thanhtien, thangkt_S, namkt_S,
              loaixn_nt,noitru_nt,taikhoan_nt,maicd_nt,chandoan_ct,maicdp_nt,kqcdoanp_nt,1, ct_thanhtoan, toaxv,
              khochan_ct,tong_thanhtienvat,'',0,loaitoa_ct,mathe_nt,tong_thanhtienbhyt,mayhct_nt,tenyhct_nt, --them 06/08/2025
              dain, CASE WHEN dain=0 THEN 0 ELSE 1 END, Matutruc,ma_con,toa_con, strtoamo --[ÔNG TRIỆU HẬU - 2025-09-08]: Xử lý toa tủ trực
          );

          RETURN jsonb_build_object(
              'status', 'success',
              'message', format('Thêm thành công chứng từ %s, %s',PresCode,text_canhbao)
          );
        END IF;
END;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'EXCEPTION.OTHERS';
        INSERT INTO badt_dhs.insert_log(tpc_code, patient_code, admission_code,
                                        error_message, error_detail, raw_json)
        VALUES(TPCode, PatientCode, AdmissionCode,
            format('EXCEPTION: %s', SQLERRM), '', input_json);
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
    END;
$$ LANGUAGE plpgsql;

`
  },
  "badt_dhs.GetSyncDepartment": {
    name: "badt_dhs.GetSyncDepartment",
    para: ["madv"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncDepartment(madv text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-08-22 09:40:22
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncDepartment(madv TEXT DEFAULT NULL)
-- Mô tả: Danh mục khoa
--   - Nếu madv IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu madv có giá trị cụ thể          => lọc theo madv
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncDepartment();        -- Trả toàn bộ khoa
--   SELECT badt_dhs.GetSyncDepartment('');      -- Trả toàn bộ khoa
--   SELECT badt_dhs.GetSyncDepartment('10');   -- Chỉ khoa mã '10'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/KjC5D19D/Postman-PU6-Cx-Wm0-F8.png)
--[ÔNG TRIỆU HẬU - 2025-08-22]: Chỉnh lại Active theo trạng thái sử dụng (xoa)
  result text;
  p_madv ALIAS FOR madv;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      '' AS "ParentDepartmentCode",							--Mã cha
      COALESCE(dv.madv,'') AS "DepartmentCode",								--Mã phòng khoa 
      COALESCE(dv.tendv,'') AS "DepartmentName",								--Tên phòng khoa
      COALESCE(dv.vietngan,'') AS "DepartmentShortName",							--Tên viết tắt 
      '' AS "Description",									--Diễn giải
      '' AS "Note",										--Ghi chú
      CASE  WHEN COALESCE(dv.khoaduoc,0) = 3 THEN 'OEXM'
	          WHEN COALESCE(dv.khoaduoc,0) = 4 THEN 'INUN'
            WHEN COALESCE(dv.khoaduoc,0) = 5 THEN 'PACL' ELSE 'FUDE' END AS "DepartmentType", 	--Loại phòng khoa : OEXM -Khám bệnh ngoại trú; INUN - Nội trú; PACL - Cận lâm sàng; FUDE -Phòng chức năng
      '' AS "MHDepartmentCode",									--Mã phòng khoa của bộ y tế 
      COALESCE(dv.ma_khoa_cv2348, '') AS "MHSpecialCode",					--Mã chuyên khoa của bộ y tế
      CASE WHEN COALESCE(dv.xoa,0) = 0 THEN TRUE ELSE FALSE END AS "Active" 		--Sử dụng 
    FROM current.dmdonvi dv
    WHERE dv.loaidv = 1 AND 
      (p_madv IS NULL OR p_madv = '' OR dv.madv = p_madv) 
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.GetSyncEthnic": {
    name: "badt_dhs.GetSyncEthnic",
    para: ["ma_medisoft"],
    returns: "text",
    codesql: `


DROP FUNCTION IF EXISTS badt_dhs.GetSyncEthnic(text);
CREATE OR REPLACE FUNCTION badt_dhs.GetSyncEthnic(ma_medisoft text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-08-13 21:48:48
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncEthnic(madt TEXT DEFAULT NULL)
-- Mô tả: Danh mục dân tộc
--   - Nếu madt IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu madt có giá trị cụ thể          => lọc theo dmdantoc.ma4750
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncEthnic();        -- Trả toàn bộ dân tộc
--   SELECT badt_dhs.GetSyncEthnic('');      -- Trả toàn bộ dân tộc
--   SELECT badt_dhs.GetSyncEthnic('00');   -- Chỉ dân tộc mã '00'
-- ===============================================================
-- Gửi lỗi khi EthnicCode = dmdantoc.madt [](https://i.ibb.co/NgqHCBxq/Postman-YV3-Oh-LTu-L5.png)
-- Gửi thành công khi EthnicCode = dmdantoc.ma4750 [](https://i.ibb.co/GQK4MF3k/i-Orsnr-Lo-W0.png)
  result text;
  p_ma_medisoft ALIAS FOR ma_medisoft;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT ON (dt.ma_medisoft)
      dt.ma_medisoft AS "EthnicCode",    --Mã dân tộc 
      dt.tendt AS "EthnicName",     --Tên dân tộc
      dt.tendt AS "EthnicDesc",     --Mô tả
      FALSE AS "IsBlocked"	     		--Khoá
    FROM current.dmdantoc AS dt
    WHERE (COALESCE(p_ma_medisoft,'') = '' OR dt.ma_medisoft = p_ma_medisoft) AND COALESCE(dt.ma_medisoft,'')<>''
    ORDER BY dt.ma_medisoft, dt.tendt DESC
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.getSyncICD": {
    name: "badt_dhs.getSyncICD",
    para: ["maicd"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.getSyncICD(maicd text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-09-17 07:59:00
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getSyncICD(maicd TEXT DEFAULT NULL)
-- Mô tả: Danh mục ICD
--   - Nếu maicd IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maicd có giá trị cụ thể          => lọc theo maicd
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncICD();        -- Trả toàn bộ ICD
--   SELECT badt_dhs.getSyncICD('');      -- Trả toàn bộ ICD
--   SELECT badt_dhs.getSyncICD('A01');   -- Chỉ ICD mã A01
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/Q3KhWxrk/xpt-JOfhugv.png)
-- emrData: {
--   "ICDCode":"A08.2", // Mã ICD
--   "ICDName": "Viêm ruột do Adenovirus", //Tên
--   "ParentCode":"A08", // Mã cha - Không có thì để trống
--   "IsTraditional": false, // ICD Y học cổ truyền
--   "IsBlocked": true
-- }
  result text;
  p_maicd ALIAS FOR maicd;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      icd.maicd AS "ICDCode",               -- Mã bệnh
      icd.tenviet AS "ICDName",             -- Tên bệnh
      '' AS "ParentCode",                   -- Mã bệnh Cha
      FALSE AS "IsTraditional",     		    -- ICD YHCT, False - Hiện đại True - Y học cổ truyền
      CASE WHEN COALESCE(icd.xoa,0) = 0 THEN FALSE ELSE TRUE END AS "IsBlocked",          -- Khóa, False: mở - True: Khóa
      CASE WHEN COALESCE(icd.xoa,0) = 0 THEN TRUE ELSE FALSE END AS "Active"          -- Khóa, False: mở - True: Khóa
    FROM current.dmicd icd
    WHERE ( COALESCE(p_maicd,'') = ''       --[ÔNG TRIỆU HẬU: 2025-09-11]
            OR 
            icd.maicd = p_maicd
          )
    ORDER BY icd.maicd
  ) AS row_data;
  RETURN result;
END;
$$;
`
  },
  "badt_dhs.GetSyncOccupation": {
    name: "badt_dhs.GetSyncOccupation",
    para: ["mann"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncOccupation(mann text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-09-11 18:57:46
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncOccupation(mann TEXT DEFAULT NULL)
-- Mô tả: Danh mục nghề nghiệp
--   - Nếu mann IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu mann có giá trị cụ thể          => lọc theo dmnghe.ma4750
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncOccupation();        -- Trả toàn bộ nghề nghiệp
--   SELECT badt_dhs.GetSyncOccupation('');      -- Trả toàn bộ nghề nghiệp
--   SELECT badt_dhs.GetSyncOccupation('00');   -- Chỉ nghề nghiệp mã '00'
-- ===============================================================
-- Gửi lỗi khi OccupationCode = dmnghe.manghe [](https://i.ibb.co/zTxJk4Ny/Postman-G7q5yg24x0.png)
-- Gửi thành công khi OccupationCode = dmnghe.ma4750 [](https://i.ibb.co/VWnGs0ns/Postman-ICBN86-I9u5.png)
--Mã nghề nghiệp 
--![](https://live.staticflickr.com/65535/54780018144_7cec49da6d_b.jpg)
  result text;
  p_mann ALIAS FOR mann;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT DISTINCT ON (nghe.manghe)
      nghe.manghe AS "OccupationCode", --[ÔNG TRIỆU HẬU: 2025-09-11]
      nghe.ma4750 AS "OccupationCode4750",    --Mã nghề nghiệp 
      nghe.tennghe AS "OccupationName",   --Nghề nghiệp
      nghe.tennghe AS "OccupationDesc",   --Mô tả
      FALSE AS "IsBlocked"	     		--Khoá
    FROM current.dmnghe AS nghe
    WHERE (COALESCE(p_mann,'') = '' OR nghe.ma4750 = p_mann) AND COALESCE(nghe.ma4750,'')<>''
    ORDER BY nghe.manghe, nghe.tennghe DESC
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.GetSyncACD": {
    name: "badt_dhs.GetSyncACD",
    para: ["macv"],
    returns: "text",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.GetSyncACD(macv text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nqhoa1005; date: 2025-05-26 18:09:54
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.GetSyncACD(macv TEXT DEFAULT NULL)
-- Mô tả: Danh mục nghề nghiệp
--   - Nếu macv IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu macv có giá trị cụ thể          => lọc theo macv
--
-- Sử dụng:
--   SELECT badt_dhs.GetSyncACD();        -- Trả toàn bộ chức danh
--   SELECT badt_dhs.GetSyncACD('');      -- Trả toàn bộ chức danh
--   SELECT badt_dhs.GetSyncACD('01');   -- Chỉ chức danh mã '01'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/XrdT52Pk/1s-Vpliup-G1.png)
  result text;
  p_macv ALIAS FOR macv;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      cv.macv AS "AcademicCode",    --Mã chức danh
      cv.tencv AS "AcademicName",   --Tên chức danh
      FALSE AS "IsBlocked"          --Khoá
    FROM current.dmchucvu cv
    WHERE p_macv IS NULL OR p_macv = '' OR cv.macv = p_macv
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.cancelCUTPParaClinRequest": {
    name: "badt_dhs.cancelCUTPParaClinRequest",
    para: ["input_json"],
    returns: "JSONB",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.cancelCUTPParaClinRequest(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-09-18 08:25:07
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-08-11
-- Hàm: badt_dhs.cancelCUTPParaClinRequest(input_json JSONB)
-- Mô tả: Hủy 1 thuốc trong toa
--   input_json: nội dung file json: thông tin bệnh nhân và toa thuốc
-- Sử dụng:
--   SELECT badt_dhs.cancelCUTPParaClinRequest(input_json JSONB);
--   Kiểm tra cls và xóa 1 cls hoặc bộ cls
-- ===============================================================
--[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
-- 0. Kiểm tra chứng từ tồn tại
--Kiểm tra CLS có xóa hay chưa
--Nếu có 1 cls dathu = 1 hoặc dath = 1
    p_mabn TEXT := input_json->>'PatientCode'; --Mã bệnh nhân
    p_maba TEXT := input_json->>'MedicalRecordNo'; -- Mã bệnh án
    p_makb TEXT := input_json->>'AdmissionCode'; -- Mã khám bệnh
    p_iddienbien TEXT := input_json->>'TPCode'; -- ID diễn biến
    p_idchidinh TEXT := input_json->>'ParaClinReqCode'; -- ID chỉ định
    p_macls TEXT := input_json->>'PCReqDltVoucherNo'; --Mã CLS

    r_cls RECORD;
    v_exists BOOLEAN;
    v_ravien BOOLEAN;
    v_dathu_dathu BOOLEAN := FALSE;
BEGIN

    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = p_mabn AND makb = p_makb AND maba = p_maba AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            p_mabn, p_makb, p_maba)
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM current.bnnoitru
        WHERE mabn = p_mabn
          AND maba = p_maba
          AND makb = p_makb
          AND COALESCE(ravien, 0) > 0
    ) INTO v_ravien;

    IF  v_ravien THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Bệnh nhân %s đã xuất viện', p_maba)
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM current.chidinhcls
        WHERE mabn = p_mabn
          AND maba = p_maba
          AND makb = p_makb
          AND iddienbien = p_iddienbien
          AND idchidinh = p_idchidinh
          AND COALESCE(xoa, 0) = 0
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('ID diễn biến %s (idchidinh=%s) không tồn tại', p_iddienbien, p_idchidinh)
        );
    END IF;

    IF v_exists THEN
        FOR r_cls IN
          SELECT mabn, maba, makb, idchidinh, iddienbien, macls, dathu, dath, dalappttt
          FROM current.chidinhcls
          WHERE mabn = p_mabn
              AND maba = p_maba
              AND makb = p_makb
              AND iddienbien = p_iddienbien
              AND idchidinh = p_idchidinh
              AND (
                  macls = p_macls
                  OR macls IN (
                      SELECT macls
                      FROM current.dmcls
                      WHERE macha = p_macls
                  )
              )
              AND COALESCE(xoa,0) = 0
        LOOP
              IF r_cls.dathu = 1 OR r_cls.dath = 1 OR r_cls.dalappttt = 1 THEN
                  v_dathu_dathu := TRUE;
              END IF;
        END LOOP;
        IF v_dathu_dathu THEN
        	RETURN jsonb_build_object(
                        'status', 'warning',
                        'message', format('Cận lâm sàng %s: đã thực hiện hoặc đã thu tiền, không thể xóa', p_macls)
                    );
        ELSE
        	FOR r_cls IN
                SELECT mabn, maba, makb, idchidinh, iddienbien, macls, dathu, dath
                FROM current.chidinhcls
                WHERE mabn = p_mabn
                    AND maba = p_maba
                    AND makb = p_makb
                    AND iddienbien = p_iddienbien
                    AND idchidinh = p_idchidinh
                    AND (
                        macls = p_macls
                        OR macls IN (
                            SELECT macls
                            FROM current.dmcls
                            WHERE macha = p_macls
                        )
                    )
                    AND COALESCE(xoa,0) = 0
            LOOP
              UPDATE current.chidinhcls SET xoa = 1, ngayxoa = NOW()
              WHERE  mabn = r_cls.mabn
                AND maba = r_cls.maba
                AND makb = r_cls.makb
                AND iddienbien = r_cls.iddienbien
                AND idchidinh = r_cls.idchidinh
                AND macls = r_cls.macls;
            END LOOP;
        END IF;
	END IF;
	RETURN jsonb_build_object(
                'status', 'success',
                'message', format('Đã xóa CLS %s thành công', p_macls));
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;

$$ LANGUAGE plpgsql;


`
  },
  "badt_dhs.cancelTPPrescription": {
    name: "badt_dhs.cancelTPPrescription",
    para: ["input_json"],
    returns: "JSONB",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.cancelTPPrescription(input_json JSONB )
RETURNS JSONB AS $$
DECLARE
-- Lastest commit: author:Nguyễn Triều Vương; date: 2026-01-10 15:44:55
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-08-11
-- Hàm: badt_dhs.cancelTPPrescription(input_json JSONB)
-- Mô tả: Hủy 1 thuốc trong toa
--   input_json: nội dung file json: thông tin bệnh nhân và toa thuốc
-- Sử dụng:
--   SELECT badt_dhs.cancelTPPrescription(input_json JSONB);
--   Nếu thuốc đã tổng hơp --> tạo toa trả với thông tin thuốc trong json --> theo tháng năm kế toán hiện tại
--   Nếu thuốc thuốc chưa tổng hợp --> xóa thuốc trong pshdxn --> tăng pstonkho.tamnhap --> xóa chungtu hoặc điều chỉnh theo thuốc còn lại trong pshdxn
-- ===============================================================
--Số lượng thuốc ngưng sử dụng
--[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
-- Lấy tháng năm kế toán
--[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
-- [2025-09-25]: Vương chỉnh
--Kiểm tra số lượng xuất - trả
--TUTRUC
-- Lấy chi tiết thuốc trả
-- Ghi vào pshdxn
-- Cập nhật tồn kho tủ trưc
-- Cộng tổng
-- Ghi chứng từ
--ENDTUTRUC
-- 1. Kiểm tra nếu chungtu đã thu tiền và chưa tổng hợp
--[NTVUONG: 2026-01-09] Kiểm tra không cho ngưng thuốc nếu chungtu đã thu tiền và chưa tổng hợp --> muốn ngưng thuốc phải hủy phiếu thu
-- 2. Kiểm tra đã in chứng từ hay chưa
-- [2025-09-25]: Vương chỉnh
--
-- 1. Kiểm tra còn đủ số lượng để trả
--Kiểm tra số lượng còn lại
-- Lấy chi tiết thuốc trả
-- Ghi vào pshdxn
-- Cập nhật tồn kho
-- Cộng tổng
-- Ghi chứng từ
-- Lấy chi tiết thuốc trả
-- UPDATE
-- Cập nhật tồn kho
-- Cộng tổng
-- Ghi chứng từ
-- UPDATE
    p_mabn TEXT := input_json->>'PatientCode'; --Mã bệnh nhân
    p_makh TEXT := input_json->>'MedicalRecordNo'; -- Mã bệnh án
    p_makb TEXT := input_json->>'AdmissionCode'; -- Mã khám bệnh
    p_iddienbien TEXT := input_json->>'TPCode'; -- ID diễn biến
    p_sohd TEXT := input_json->>'PresCode'; -- Số hd
    p_mahh TEXT := input_json->>'PresDtlCode'; --Mã hàng hóa

    p_sang NUMERIC := input_json->>'CancelMorningQty'; --Số lượng thuốc ngưng sáng
    p_trua NUMERIC := input_json->>'CancelMiddayQty'; --Số lượng thuốc ngưng trưa
    p_chieu NUMERIC := input_json->>'CancelAfternoonQty'; --Số lượng thuốc chiều
    p_toi NUMERIC := input_json->>'CancelEveningQty'; --Số lượng thuốc tối

    p_soluong NUMERIC := input_json->>'CancelDispenseQty'; --Tổng số lượng thuốc ngưng
    p_matutruc TEXT := COALESCE(input_json->>'Matutruc',''); --Mã tủ trực

    tong_thanhtien NUMERIC := 0;
    tong_thanhtienbhyt NUMERIC := 0;
    tong_thanhtienvat NUMERIC := 0;
    tong NUMERIC := 0;
    so_mahh NUMERIC := 0;
    tong_tien_tra NUMERIC := 0;
    tong_tien_bhyt_tra NUMERIC := 0;
    sl_xuat_tutruc NUMERIC := 0;

    r_hd RECORD;
    r_ct RECORD;

    thangnam TEXT;
    thangkt_S TEXT;
    namkt_S TEXT;
    v_code TEXT;

    r_mahh TEXT:='';
    r_sohd TEXT:='';
    r_matutuc TEXT:='';
	r_kyhieu TEXT:=''; --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
	t_loaixn TEXT:=''; --Loại trả: nkt, tto

    v_dain_exists BOOLEAN;
    v_matutruc_exists BOOLEAN;
    v_toatutruc_exists BOOLEAN;

BEGIN

    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = p_mabn AND maba = p_makh AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message',
            format('Mabn: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)',
            p_mabn, p_makh)
        );
    END IF;

    SELECT giatri INTO thangnam FROM current.system WHERE tents = 'thanglv';
    	thangkt_S := SPLIT_PART(thangnam, '/', 1);
        namkt_S := SPLIT_PART(thangnam, '/', 2);

    SELECT COALESCE(sohd,'') sohd, COALESCE(mahh,'') mahh, COALESCE(tutruc,'') tutruc, COALESCE(kyhieu,'') kyhieu INTO r_sohd, r_mahh, r_matutuc, r_kyhieu
    FROM current.pshdxn
    WHERE mabn = p_mabn
      AND makh = p_makh
      AND sohd = p_sohd
      AND mahh = p_mahh
      AND COALESCE(xoa, 0) = 0 ;

	IF r_kyhieu = 'TMO' THEN
		t_loaixn = 'tto';
	ELSE
		t_loaixn = 'nkt';
	END IF;

    RAISE NOTICE 'p_mabn: %', p_mabn;
    RAISE NOTICE 'p_makh: %', p_makh;
    RAISE NOTICE 'p_sohd: %', p_sohd;
    RAISE NOTICE 'p_mahh: %', p_mahh;

    RAISE NOTICE 'mahh: %', COALESCE(r_mahh,'');
    RAISE NOTICE 'sohd: %', COALESCE(r_sohd,'');
    RAISE NOTICE 'tutruc: %', COALESCE(r_matutuc,'');

    IF COALESCE(r_mahh,'') = '' THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('PresDtlCode: %s không tồn tại', p_mahh)
        );
    END IF;

    IF COALESCE(r_sohd,'') = '' THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Hóa đơn %s (iddienbien=%s) không tồn tại', p_sohd, p_iddienbien)
        );
    END IF;


    IF  COALESCE(r_matutuc,'') != '' THEN -- toa tủ trực
    	SELECT EXISTS (
          SELECT 1 FROM current.dmdonvi WHERE madv = p_matutruc AND COALESCE(xoa, 0) = 0
      ) INTO v_matutruc_exists;

      IF NOT v_matutruc_exists  THEN
          RETURN jsonb_build_object(
              'status', 'warning',
              'message', format('Mã tủ trực: %s không tồn tại', p_matutruc)
          );
      END IF;

      SELECT EXISTS (
          SELECT 1
          FROM current.pshdxn
          WHERE mabn = p_mabn
            AND makh = p_makh
            AND sohd = p_sohd
            AND mahh = p_mahh
            AND tutruc = p_matutruc
            AND COALESCE(xoa, 0) = 0
      ) INTO v_toatutruc_exists;

      IF NOT v_toatutruc_exists  THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Toa tủ trực : %s không tồn tại', p_sohd)
        );
      END IF;

        v_code := to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || UPPER(substring(md5(random()::text), 1, 4));

        SELECT Sum(toncuoi) AS toncuoi INTO sl_xuat_tutruc
        FROM
            ( SELECT Sum(soluong) AS toncuoi
              FROM CURRENT.pshdxn
              WHERE mahh = p_mahh
                    AND makh = p_makh
                    AND COALESCE(tutruc,'') = p_matutruc
                    AND sohd = p_sohd
                    AND loaixn = 'xbb'
                    AND toatutruc IN (1,2)
                    AND COALESCE(noitru,0) = 1
                    AND COALESCE(xoa,0) = 0
                    AND COALESCE(toacon, 0) = 0
        UNION
            SELECT Sum(-soluong) AS toncuoi
            FROM CURRENT.pshdxn
            WHERE mahh = p_mahh
                    AND makh = p_makh
                    AND COALESCE(tutruc,'') = p_matutruc
                    AND sohdx = p_sohd
                    AND loaixn = 'ttt'
                    AND COALESCE(noitru,0) = 1
                    AND COALESCE(xoa,0) = 0
                    AND COALESCE(toacon, 0) = 0
                    AND COALESCE(thanhtoan, '') = ''
        ) AS tam;

        IF p_soluong > sl_xuat_tutruc THEN
        	RETURN jsonb_build_object(
              'status', 'warning',
              'message', format('Số lượng trả lớn hơn số lượng xuất: trả %s, xuất %s', p_soluong,sl_xuat_tutruc)
          );
        END IF;
          FOR r_hd IN
              SELECT *, p_soluong as soluong_tra
              FROM current.pshdxn hd
              WHERE hd.mahh = p_mahh
                AND hd.sohd = p_sohd
                AND hd.mabn = p_mabn
                AND hd.makh = p_makh
                AND hd.tutruc = p_matutruc
                AND COALESCE(hd.xoa, 0) = 0
          LOOP
              IF COALESCE(r_hd.soluong, 0) > 0 THEN
                  INSERT INTO current.pshdxn(
                      sohd, sohdx, iddienbien, mabn, makh,
                      mahh, ngayhd, ngaylap, giolap, madv,
                      soluong, sang, trua, chieu, toi, lieu_dung, cachuong,
                      giaban, giavat, giabhyt, thanhtien, thanhtienbhyt, bhyt,
                      handung, solo, visa, thangkt, namkt,
                      stt, loaixn, noitru, khole, toaxv,
                      madt, khochan, theodon, tienvat, tenmay, loaitoa, thanhtoan,
                      tutruc, dain, toatutruc, kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
                  )
                  VALUES (
                      v_code, r_hd.sohd, r_hd.iddienbien, r_hd.mabn, r_hd.makh,
                      r_hd.mahh, r_hd.ngayhd, r_hd.ngaylap, now(), r_hd.madv,
                      r_hd.soluong_tra, r_hd.sang, r_hd.trua, r_hd.chieu, r_hd.toi, r_hd.lieu_dung, r_hd.cachuong,
                      r_hd.giaban, r_hd.giavat, r_hd.giabhyt, 
                      ROUND(r_hd.soluong_tra * COALESCE(r_hd.giavat, 0), 0),
                      ROUND(r_hd.soluong_tra * COALESCE(r_hd.giabhyt, 0), 0), r_hd.bhyt, --[NTVUONG: 2025-12-10] Tính lại thanhtien
                      r_hd.handung, r_hd.solo, r_hd.visa, thangkt_S, namkt_S,
                      r_hd.stt, 'ttt', r_hd.noitru, r_hd.khole, 0,
                      r_hd.madt, r_hd.khochan, r_hd.theodon, r_hd.tienvat, r_hd.tenmay, r_hd.loaitoa, r_hd.thanhtoan,
                      r_hd.tutruc, 1,1, COALESCE(r_hd.kyhieu,'') --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
                  );

                  UPDATE current.pstonkho
                  SET nhap = COALESCE(nhap, 0) + COALESCE(r_hd.soluong_tra,0),
                      toncuoi = COALESCE(toncuoi, 0) + COALESCE(r_hd.soluong_tra,0)
                  WHERE COALESCE(mahh, '') = COALESCE(r_hd.mahh, '')
                    AND COALESCE(giavat, 0) = COALESCE(r_hd.giavat, 0)
                    AND COALESCE(madv, '') = COALESCE(r_hd.tutruc, '')
                    AND COALESCE(handung, '') = COALESCE(r_hd.handung, '')
                    AND COALESCE(thangkt, '') = COALESCE(thangkt_S, '')
                    AND COALESCE(namkt, '') = COALESCE(namkt_S, '');

                  tong_thanhtien := tong_thanhtien + COALESCE(r_hd.thanhtien, 0);
                  tong_thanhtienbhyt := tong_thanhtienbhyt + COALESCE(r_hd.thanhtienbhyt, 0);
                  tong_thanhtienvat := tong_thanhtienvat + COALESCE(r_hd.tienvat, 0);
                  tong_tien_tra := tong_tien_tra + COALESCE(r_hd.giavat, 0) * COALESCE(r_hd.soluong_tra, 0);
                  tong_tien_bhyt_tra := tong_tien_bhyt_tra + COALESCE(r_hd.giabhyt, 0) * COALESCE(r_hd.soluong_tra, 0);
              END IF;
          END LOOP;

          FOR r_ct IN
              SELECT *
              FROM current.chungtu ct
              WHERE ct.sohd = p_sohd
                AND ct.mabn = p_mabn
                AND ct.makh = p_makh
                AND ct.tutruc = p_matutruc
                AND COALESCE(ct.xoa, 0) = 0
          LOOP
              INSERT INTO current.chungtu(
                  sohd, sohdx, iddienbien, mabn, makh, madt, madv,
                  manv, ngayuong, ghichu, khole,
                  ngayhd, ngaylap, giolap, thanhtien, thangkt, namkt,
                  loaixn, noitru, taikhoan, maicd, kqcdoan, maicdp, kqcdoanp, api, thanhtoan, toaxv,
                  khochan, tienvat, tenmay, taikham, loaitoa, mathe, thanhtienbhyt, mayhct, tenyhct,
                  tutruc, dain, toatutruc, kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
              )
              VALUES (
                  v_code, '', r_ct.iddienbien, r_ct.mabn, r_ct.makh, r_ct.madt, r_ct.madv, --[ntvuong] 2025-10-02: không ghi nhận sohdx của ct trả
                  r_ct.manv, r_ct.ngayuong, r_ct.ghichu, r_ct.khole,
                  r_ct.ngayhd, r_ct.ngaylap, now(), tong_thanhtien, thangkt_S, namkt_S,
                  'ttt', r_ct.noitru, r_ct.taikhoan, r_ct.maicd, r_ct.kqcdoan, r_ct.maicdp, r_ct.kqcdoanp, r_ct.api, r_ct.thanhtoan, r_ct.toaxv,
                  r_ct.khochan, tong_thanhtienvat, r_ct.tenmay, r_ct.taikham, r_ct.loaitoa, r_ct.mathe, tong_thanhtienbhyt, r_ct.mayhct, r_ct.tenyhct,
                  r_ct.tutruc, 1,1, COALESCE(r_ct.kyhieu,'') --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
              );
          END LOOP;

          RETURN jsonb_build_object(
              'status', 'success',
              'message', format('Thêm thành công chứng từ trả tủ trực %s, chứng từ mới: %s',p_matutruc, v_code)
          );
    ELSE --toa thường
        IF EXISTS (
            SELECT 1
            FROM current.chungtu
            WHERE mabn = p_mabn 
              AND makh = p_makh 
              AND sohd = p_sohd
              AND COALESCE(xoa,0) = 0
              AND COALESCE(dain,0) = 0 
			  AND COALESCE(dathu,0) = 1
        ) THEN
            RETURN json_build_object(
                'status', 'error',
                'message', 'Không thể ngưng thuốc. Chứng từ đã thu tiền.'
            );
        END IF;
        SELECT EXISTS (
            SELECT 1
            FROM current.pshdxn
            WHERE mabn = p_mabn
              AND makh = p_makh
              AND sohd = p_sohd
              AND mahh = p_mahh
              AND COALESCE(xoa, 0) = 0
              AND COALESCE(dain, 0) = 1
        ) INTO v_dain_exists;

    	IF v_dain_exists THEN

        v_code := to_char(NOW(), 'YYYYMMDD-HH24MISS') || '-' || UPPER(substring(md5(random()::text), 1, 4));

        SELECT SUM(CASE WHEN loaixn = 'xbb' AND COALESCE(dain,0) = 1 THEN soluong ELSE 0 END)
             - SUM(CASE WHEN loaixn = 'nkt' OR loaixn = 'tto' THEN soluong ELSE 0 END)
        INTO tong
        FROM current.pshdxn
        WHERE mabn = p_mabn
          AND makh = p_makh
          AND mahh = p_mahh
		  AND COALESCE(kyhieu,'') = r_kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
          AND COALESCE(xoa, 0) = 0;

        IF tong <= 0 THEN
            RETURN jsonb_build_object(
                'status', 'warning',
                'message', format('Thuốc/vật tư %s đã trả đủ số lượng, không thể trả thêm', p_mahh)
            );
        END IF;

        IF p_soluong > tong THEN
            RETURN jsonb_build_object(
                'status', 'warning',
                'message', format('Thuốc/vật tư %s, số lượng trả %s > số lượng còn lại %s, không đủ để trả', p_mahh,p_soluong,tong)
            );
        END IF;

        FOR r_hd IN
            SELECT *, p_soluong as soluong_tra
            FROM current.pshdxn hd
            WHERE hd.mahh = p_mahh
              AND hd.sohd = p_sohd
              AND hd.mabn = p_mabn
              AND hd.makh = p_makh
              AND COALESCE(hd.xoa, 0) = 0
        LOOP
            IF COALESCE(r_hd.soluong, 0) > 0 THEN
                INSERT INTO current.pshdxn(
                    sohd, sohdx, iddienbien, mabn, makh,
                    mahh, ngayhd, ngaylap, giolap, madv,
                    soluong, sang, trua, chieu, toi, lieu_dung, cachuong,
                    giaban, giavat, giabhyt, thanhtien, thanhtienbhyt, bhyt,
                    handung, solo, visa, thangkt, namkt,
                    stt, loaixn, noitru, khole, toaxv,
                    madt, khochan, theodon, tienvat, tenmay, loaitoa, thanhtoan, kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
                )
                VALUES (
                    v_code, r_hd.sohd, r_hd.iddienbien, r_hd.mabn, r_hd.makh,
                    r_hd.mahh, r_hd.ngayhd, r_hd.ngaylap, now(), r_hd.madv,
                    r_hd.soluong_tra, r_hd.sang, r_hd.trua, r_hd.chieu, r_hd.toi, r_hd.lieu_dung, r_hd.cachuong,
                    r_hd.giaban, r_hd.giavat, r_hd.giabhyt, 
                    ROUND(r_hd.soluong_tra * COALESCE(r_hd.giavat, 0), 0),
                    ROUND(r_hd.soluong_tra * COALESCE(r_hd.giabhyt, 0), 0), r_hd.bhyt, --[NTVUONG: 2025-12-10] Tính lại thanhtien
                    r_hd.handung, r_hd.solo, r_hd.visa, thangkt_S, namkt_S,
                    r_hd.stt, t_loaixn, r_hd.noitru, r_hd.khole, 0,
                    r_hd.madt, r_hd.khochan, r_hd.theodon, r_hd.tienvat, r_hd.tenmay, r_hd.loaitoa, r_hd.thanhtoan, COALESCE(r_hd.kyhieu,'')  --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
                );

                UPDATE current.pstonkho
                SET tamnhap = COALESCE(tamnhap, 0) + COALESCE(r_hd.soluong_tra, 0)
                WHERE COALESCE(mahh, '') = COALESCE(r_hd.mahh, '')
                  AND COALESCE(giavat, 0) = COALESCE(r_hd.giavat, 0)
                  AND COALESCE(khocp, '') = COALESCE(r_hd.khole, '')
                  AND COALESCE(handung, '') = COALESCE(r_hd.handung, '')
                  AND COALESCE(thangkt, '') = COALESCE(thangkt_S, '')
                  AND COALESCE(namkt, '') = COALESCE(namkt_S, '');

                tong_thanhtien := tong_thanhtien + COALESCE(r_hd.thanhtien, 0);
                tong_thanhtienbhyt := tong_thanhtienbhyt + COALESCE(r_hd.thanhtienbhyt, 0);
                tong_thanhtienvat := tong_thanhtienvat + COALESCE(r_hd.tienvat, 0);
                tong_tien_tra := tong_tien_tra + COALESCE(r_hd.giavat, 0) * COALESCE(r_hd.soluong_tra, 0);
                tong_tien_bhyt_tra := tong_tien_bhyt_tra + COALESCE(r_hd.giabhyt, 0) * COALESCE(r_hd.soluong_tra, 0);
            END IF;
        END LOOP;

        FOR r_ct IN
            SELECT *
            FROM current.chungtu ct
            WHERE ct.sohd = p_sohd
              AND ct.mabn = p_mabn
              AND ct.makh = p_makh
              AND COALESCE(ct.xoa, 0) = 0
        LOOP
            INSERT INTO current.chungtu(
                sohd, sohdx, iddienbien, mabn, makh, madt, madv,
                manv, ngayuong, ghichu, khole,
                ngayhd, ngaylap, giolap, thanhtien, thangkt, namkt,
                loaixn, noitru, taikhoan, maicd, kqcdoan, maicdp, kqcdoanp, api, thanhtoan, toaxv,
                khochan, tienvat, tenmay, taikham, loaitoa, mathe, thanhtienbhyt, mayhct, tenyhct, kyhieu --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
            )
            VALUES (
                v_code, '', r_ct.iddienbien, r_ct.mabn, r_ct.makh, r_ct.madt, r_ct.madv, --[ntvuong] 2025-10-02: không ghi nhận sohdx của ct trả
                r_ct.manv, r_ct.ngayuong, r_ct.ghichu, r_ct.khole,
                r_ct.ngayhd, r_ct.ngaylap, now(), tong_thanhtien, thangkt_S, namkt_S,
                t_loaixn, r_ct.noitru, r_ct.taikhoan, r_ct.maicd, r_ct.kqcdoan, r_ct.maicdp, r_ct.kqcdoanp, r_ct.api, r_ct.thanhtoan, r_ct.toaxv,
                r_ct.khochan, tong_thanhtienvat, r_ct.tenmay, r_ct.taikham, r_ct.loaitoa, r_ct.mathe, tong_thanhtienbhyt, r_ct.mayhct, r_ct.tenyhct, COALESCE(r_ct.kyhieu,'') --[NTVUONG: 2025-11-07] Bổ sung điều kiện kyhieu
            );
        END LOOP;

        RETURN jsonb_build_object(
            'status', 'success',
            'message', format('Thêm thành công chứng từ trả %s', v_code)
        );

    ELSE -- Thuốc chưa tổng hợp ---cập nhật [08/09/2025]
		SELECT COUNT(DISTINCT mahh) INTO so_mahh
        FROM current.pshdxn
        WHERE mabn = p_mabn
          AND makh = p_makh
          AND sohd = p_sohd
          AND COALESCE(xoa,0) = 0
          AND COALESCE(dain,0) = 0;

        FOR r_hd IN
            SELECT *, p_soluong as soluong_tra
            FROM current.pshdxn hd
            WHERE hd.mahh = p_mahh
              AND hd.sohd = p_sohd
              AND hd.mabn = p_mabn
              AND hd.makh = p_makh
              AND hd.soluong >= p_soluong --[VUONG] them theo yeu cầu
              AND COALESCE(hd.xoa, 0) = 0
              AND COALESCE(hd.dain, 0) = 0
        LOOP
            RAISE NOTICE 'soluong_tra: %',
                  p_soluong;
            IF COALESCE(r_hd.soluong_tra, 0) > 0 THEN --soluong --> soluong_tra
                IF COALESCE(r_hd.soluong_tra, 0) = COALESCE(r_hd.soluong, 0) THEN
                 RAISE NOTICE 'soluong=nhau -->xóa: %',
                  r_hd.soluong;
                UPDATE CURRENT.pshdxn SET xoa = 1, ngayxoa = NOW()
                WHERE mahh = p_mahh
                      AND sohd = p_sohd
                      AND mabn = p_mabn
                      AND makh = p_makh
                      AND soluong = r_hd.soluong_tra;
                ELSE --So luong tra < soluong
                RAISE NOTICE 'soluong > hơn -->giảm: %', r_hd.soluong;
                UPDATE CURRENT.pshdxn SET
                	sang = COALESCE(sang,0) - COALESCE(p_sang,0),
                    trua = COALESCE(trua,0) - COALESCE(p_trua,0),
                    chieu = COALESCE(chieu,0) - COALESCE(p_chieu,0),
                    toi = COALESCE(toi,0) - COALESCE(p_toi,0),
                    soluong = soluong - r_hd.soluong_tra,
                    thanhtien = (r_hd.soluong - r_hd.soluong_tra) * COALESCE(r_hd.giavat,0),
                    thanhtienbhyt = (r_hd.soluong - r_hd.soluong_tra) * COALESCE(r_hd.giabhyt,0)
                WHERE mahh = p_mahh
                      AND sohd = p_sohd
                      AND mabn = p_mabn
                      AND makh = p_makh
                      AND soluong > r_hd.soluong_tra;
                END IF;

                RAISE NOTICE 'Cập nhật tồn kho, chưa tổng hợp: %', r_hd.soluong_tra;
                UPDATE current.pstonkho
                SET tamxuat = COALESCE(tamxuat, 0) - COALESCE(r_hd.soluong_tra, 0)
                WHERE COALESCE(mahh, '') = COALESCE(r_hd.mahh, '')
                  AND COALESCE(giavat, 0) = COALESCE(r_hd.giavat, 0)
                  AND COALESCE(khocp, '') = COALESCE(r_hd.khole, '')
                  AND COALESCE(handung, '') = COALESCE(r_hd.handung, '')
                  AND COALESCE(thangkt, '') = COALESCE(thangkt_S, '')
                  AND COALESCE(namkt, '') = COALESCE(namkt_S, '');

                tong_thanhtien := tong_thanhtien + COALESCE(r_hd.thanhtien, 0);
                tong_thanhtienbhyt := tong_thanhtienbhyt + COALESCE(r_hd.thanhtienbhyt, 0);
                tong_thanhtienvat := tong_thanhtienvat + COALESCE(r_hd.tienvat, 0);
                tong_tien_tra := tong_tien_tra + COALESCE(r_hd.giavat, 0) * COALESCE(r_hd.soluong_tra, 0);
                tong_tien_bhyt_tra := tong_tien_bhyt_tra + COALESCE(r_hd.giabhyt, 0) * COALESCE(r_hd.soluong_tra, 0);

                RAISE NOTICE 'tong_thanhtien: %', tong_thanhtien;
                RAISE NOTICE 'tong_thanhtienbhyt: %', tong_thanhtienbhyt;
                RAISE NOTICE 'tong_thanhtienvat: %', tong_thanhtienvat;
                RAISE NOTICE 'tong_tien_tra: %', tong_tien_tra;
                RAISE NOTICE 'tong_tien_bhyt_tra: %', tong_tien_bhyt_tra;
            END IF;
        END LOOP;

        FOR r_ct IN
            SELECT *
            FROM current.chungtu ct
            WHERE ct.sohd = p_sohd
              AND ct.mabn = p_mabn
              AND ct.makh = p_makh
              AND COALESCE(ct.xoa, 0) = 0
        LOOP
            IF so_mahh = 1 THEN --xóa chưng từ
                RAISE NOTICE 'Tổng tiền chứng từ %', r_ct.thanhtien;
                IF r_ct.thanhtien = tong_tien_tra THEN
                  RAISE NOTICE 'Xoa chứng từ %', r_ct.sohd;
                  UPDATE CURRENT.chungtu SET xoa = 1, ngayxoa = NOW()
                  WHERE sohd = p_sohd
                        AND mabn = p_mabn
                        AND makh = p_makh;
                ELSE
                    RAISE NOTICE 'Cập nhật chứng từ %', r_ct.sohd;
                	UPDATE CURRENT.chungtu SET
                      thanhtien = thanhtien - tong_tien_tra,
                      tienvat = tienvat - tong_tien_tra,
                      thanhtienbhyt = thanhtienbhyt - tong_tien_bhyt_tra
                  WHERE sohd = p_sohd
                        AND mabn = p_mabn
                        AND makh = p_makh;
                END IF;
            ELSE -- cập nhật chứng từ theo tiền còn lại lại
                RAISE NOTICE 'Cập nhật chứng từ, còn lại %', r_ct.sohd;
            	UPDATE CURRENT.chungtu SET
                	thanhtien = thanhtien - tong_tien_tra,
                    tienvat = tienvat - tong_tien_tra,
                    thanhtienbhyt = thanhtienbhyt - tong_tien_bhyt_tra
                WHERE sohd = p_sohd
                      AND mabn = p_mabn
                      AND makh = p_makh;

            END IF;

        END LOOP;

        RETURN jsonb_build_object(
            'status', 'success',
            'message', format('Cập nhật thành công chứng từ %s', p_sohd)
        );
    END IF;
  END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;



`
  },
  "badt_dhs.getCUTPParaClinRequest": {
    name: "badt_dhs.getCUTPParaClinRequest",
    para: ["mabn","makb","maba","iddienbien","idchidinh","thangkt","namkt"],
    returns: "TEXT",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.getCUTPParaClinRequest(mabn TEXT, makb TEXT, maba TEXT, iddienbien TEXT, idchidinh TEXT, thangkt TEXT, namkt TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nkduyt25013; date: 2026-03-30 14:50:36
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getCUTPParaClinRequest(mabn)
-- Mô tả: Tạo chỉ dịnh cls
-- Sử dụng:
--   SELECT badt_dhs.getCUTPParaClinRequest('2025005370','2505003574','2025000616','CC3.20250528.093032','2025000616_20250528093139','05','2025');
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/jvVQv0wB/Postman-Ah-JB3kdd-VR.png)
  result text;
  p_mabn ALIAS FOR mabn;
  p_makb ALIAS FOR makb;
  p_maba ALIAS FOR maba;
  p_iddienbien ALIAS FOR iddienbien;
  p_idchidinh ALIAS FOR idchidinh;
  p_thangkt ALIAS FOR thangkt;
  p_namkt ALIAS FOR namkt;

  p_manv TEXT;

BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM current.chidinhcls cls
    WHERE cls.xoa = 0
      AND cls.mabn = p_mabn
      AND cls.makb = p_makb
      AND cls.maba = p_maba
      AND cls.iddienbien = p_iddienbien
      AND cls.idchidinh = p_idchidinh
      AND cls.thangkt = p_thangkt
      AND cls.namkt = p_namkt
  ) THEN
    RETURN NULL;
  END IF;

    SELECT qt.manv
    INTO p_manv
    FROM current.qtdieutri qt
    WHERE qt.iddienbien = p_iddienbien;

  SELECT row_to_json(row_data)::TEXT
  INTO result
  FROM (
    SELECT
      p_iddienbien AS "TPCode",
      p_makb AS "AdmissionCode",
      p_maba AS "MedicalRecordNo",
      p_idchidinh AS "ParaClinReqCode",
      p_mabn AS "PatientCode",
      p_manv AS "EmployeeCode",
      (
        SELECT json_agg(sub_row)
        FROM (
          SELECT
            cls.idchidinh ||'_'|| cls.macls AS "PCReqDltVoucherNo",
            cls.stt AS "OrderNo",
            cls.macls AS "MedSerCode",
            dm.tencls AS "MedSerName",
            NULLIF(dm.dvt,'') AS "UOMCode",
            cls.soluong AS "ParaClinQty",
            cls.tenclsphu AS "PCReqDtlNotes",
            1 AS "PatientObject",
            CASE WHEN cls.thuphi = 1 OR cls.bhyt = 0 OR dt.bhyt NOT IN (1,2) THEN FALSE ELSE TRUE END AS "isHI",
            to_char(cls.ngaykcb, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "FromDate",
            to_char(cls.ngaykcb, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "ToDate"
          FROM current.chidinhcls cls
          LEFT JOIN current.dmcls dm ON dm.macls = cls.macls
          LEFT JOIN current.dmdoituong dt ON dt.madt = cls.madt
          WHERE cls.xoa = 0
            AND cls.mabn = p_mabn
            AND cls.makb = p_makb
            AND cls.maba = p_maba
            AND cls.iddienbien = p_iddienbien
            AND cls.idchidinh = p_idchidinh
            AND cls.thangkt = p_thangkt
            AND cls.namkt = p_namkt
        ) sub_row
      ) AS "ParaClinRequests"
  ) row_data;

  RETURN result;
END;
$$;

`
  },
  "badt_dhs.deleteTPPrescription": {
    name: "badt_dhs.deleteTPPrescription",
    para: ["input_json"],
    returns: "JSONB",
    codesql: `

/*
   SELECT * FROM badt_dhs.deleteTPPrescription('{
    "PatientCode": "2025019872",
    "MedicalRecordNo": "2025007173",
    "TPCode": "DH3.X25.0702.080350",
    "PresCode": "Z12.X25.0619.1308P7"
}'::jsonb) 
*/

CREATE OR REPLACE FUNCTION badt_dhs.deleteTPPrescription(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
-- Lastest commit: author:Nguyễn Triều Vương; date: 2025-10-06 14:01:25
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-07-01
-- Hàm: badt_dhs.deleteTPPrescription(input_json JSONB)
-- Mô tả:
--   - PatientCode			Mã số bệnh nhân
--   - MedicalRecordNo			Mã số bệnh án
--   - TPCode	ID diễn biến
--   - PresCode			số hóa đơn
-- Sử dụng:
-- Xóa toa thuốc
-- ===============================================================
-- Biến dùng để gom thông tin trả về cho client
--[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
--[ntvuong: 2025-10-06] Kiểm tra chứng từ
--[ntvuong] thay đổi thông báo warning --> error
-- Kiểm tra chứng từ đã phát thuốc hoặc thu tiền
-- Kiểm tra chứng từ đã tổng hợp tại khoa
--1.
--
--2.
--3.
--4.
  
  p_mabn TEXT := input_json->>'PatientCode';
  p_makh TEXT := input_json->>'MedicalRecordNo';
  p_makb TEXT := input_json->>'AdmissionCode';
  p_iddienbien TEXT := input_json->>'TPCode';
  p_sohd TEXT := input_json->>'PresCode';

    v_exists           BOOLEAN;
    v_updated_inventory  INT := 0;
    v_deleted_detail     INT := 0;
    v_deleted_header     INT := 0;

    rec RECORD;
    r_ct RECORD;
BEGIN

    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = p_mabn AND maba = p_makh AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            p_mabn,  p_makh)
        );
    END IF;
    SELECT sohd, mabn, makh, iddienbien,COALESCE(dain,0) as dain, COALESCE(dathu,0) as dathu,COALESCE(ttchinhtoa,0) as ttchinhtoa
    INTO r_ct
    FROM   current.chungtu ct
    WHERE  ct.sohd        = p_sohd
      AND  ct.iddienbien  = p_iddienbien
      AND  ct.mabn        = p_mabn
      AND  ct.makh        = p_makh
      AND  COALESCE(xoa,0) = 0;

    IF COALESCE(r_ct.sohd,'') = '' THEN
		IF COALESCE(p_sohd,'') = '' THEN
	       	RETURN jsonb_build_object(
	            'status' , 'error',
	            'message', format('Số hóa đơn (PresCode) không được rỗng!')
	        );
       ELSE
       	RETURN jsonb_build_object(
            'status' , 'error',
            'message', format('PresCode = %s và TPCode = %s không tồn tại',
                              p_sohd, p_iddienbien)
        );
       END IF;
    END IF;
    
    RAISE NOTICE 'Kiểm tra chứng từ đã phát thuốc hoặc thu tiền';
    IF COALESCE(r_ct.dain,0) = 1 OR COALESCE(r_ct.dathu,0) = 1 THEN
        RETURN json_build_object(
            'status', 'error',
            'message', 'Không thể xóa!. Chứng từ đã phát thuốc hoặc thu tiền.'
        );
    END IF;
    
    RAISE NOTICE 'Kiểm tra chứng từ đã tổng hợp tại khoa';
    IF COALESCE(r_ct.ttchinhtoa,0) = 5 THEN
        RETURN json_build_object(
            'status', 'error',
            'message', 'Không thể xóa!. Chứng từ đã được tổng hợp tại khoa.'
        );
    END IF;
	FOR rec IN
        SELECT hd.sohd, ngayhd, hd.mabn, makh, mahh, giavat, giaban, COALESCE(giabhyt,0) giabhyt, soluong,
				handung, solo, visa, thangkt, namkt, khole
        FROM current.pshdxn hd
        WHERE  hd.sohd        = p_sohd
          AND  hd.iddienbien  = p_iddienbien
          AND  hd.mabn        = p_mabn
          AND  hd.makh        = p_makh
          AND  COALESCE(xoa,0) = 0
        FOR UPDATE
    LOOP
    UPDATE current.pstonkho
        SET    tamxuat = tamxuat - rec.soluong
        WHERE  mahh     = rec.mahh
          AND  giavat::NUMERIC   = rec.giavat::NUMERIC
          AND  handung  = rec.handung
          AND  solo     = rec.solo
          AND  thangkt  = rec.thangkt
          AND  namkt    = rec.namkt
          AND  khocp    = rec.khole;

        IF NOT FOUND THEN
            RAISE EXCEPTION
              'Không tìm thấy (hoặc trùng khớp) dòng tồn kho cho mahh=%, giavat=%,handung=%, solo=%,thangkt=%, namkt=%, khocp=%',
              rec.mahh, rec.giavat, rec.handung, rec.solo, rec.thangkt, rec.namkt, rec.khole;
        END IF;

        v_updated_inventory := v_updated_inventory + 1;
    END LOOP;
    UPDATE current.pshdxn hd
    SET    xoa     = 1,
           ngayxoa = CURRENT_TIMESTAMP
    WHERE  hd.sohd        = p_sohd
      AND  hd.iddienbien  = p_iddienbien
      AND  hd.mabn        = p_mabn
      AND  makh        = p_makh
      AND  COALESCE(xoa,0) = 0;

    GET DIAGNOSTICS v_deleted_detail = ROW_COUNT;

    UPDATE current.chungtu ct
    SET    xoa     = 1,
           ngayxoa = CURRENT_TIMESTAMP
    WHERE  ct.sohd        = p_sohd
      AND  ct.iddienbien  = p_iddienbien
      AND  ct.mabn        = p_mabn
      AND  ct.makh        = p_makh
      AND  COALESCE(xoa,0) = 0;

    GET DIAGNOSTICS v_deleted_header = ROW_COUNT;

    RETURN jsonb_build_object(
        'status'            , 'success',
        'message'           , format('Đã xóa hóa đơn %s (iddienbien=%s)', p_sohd, p_iddienbien)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status' , 'error',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

`
  },
  "badt_dhs.deleteTreatmentProcess": {
    name: "badt_dhs.deleteTreatmentProcess",
    para: ["input_json"],
    returns: "JSONB",
    codesql: `

/*
SELECT * FROM badt_dhs.deletetreatmentprocess('{
    "TPID": 10318,
    "VSID": null,
    "Infor": "Diễn biến 1 EMR ngày 8/7",
    "Reason": "",
    "TPCode": "2507081615-010348",
    "TPDate": "2025-07-08T08:35:00Z",
    "FilePath": "",
    "PresCode": null,
    "TPDateVN": "2025-07-08 15:35:00",
    "TakeCare": null,
    "Diagnosis": [
        {
            "TPID": 10318,
            "IsMain": true,
            "OrderNum": 0,
            "DiagnosisICD": 12631,
            "DiagnosisDesc": "Bệnh lỵ trực khuẩn do Shigella boydii",
            "DiagnosisType": 1,
            "DiagnosisICDCode": "A03.2"
        }
    ],
    "FileDocID": "",
    "VitalSign": null,
    "SignStatus": 0,
    "DiseaseName": "",
    "IsNotChange": false,
    "PatientCode": "2025019877",
    "OtherCommand": "",
    "AdmissionCode": "2506012248",
    "DiagnosisDesc": "Bệnh lỵ trực khuẩn do Shigella boydii",
    "PatientObject": "01",
    "Prescriptions": [],
    "RiskOfFalling": null,
    "DepartmentCode": "30",
    "FollowUpCommand": "",
    "I_PatientObject": 1,
    "MedicalRecordNo": "2025007178",
    "ParaClinReqCode": null,
    "NutritionCommand": "",
    "ParaClinRequests": [],
    "VitalSignCommand": "Mạch (lần/phút):  70, Nhiệt độ (°C):  36.5, SpO₂(%):  99, Huyết áp (mmHg):  110/70, Nhịp thở (lần/phút):  20, Cân nặng (kg):  65, Chiều cao (cm):  165, BMI:  23.9, Tri giác:  ",
    "TreatmentDoctorID": 308,
    "DiagnosisOtherDesc": "",
    "TreatmentDoctorCode": "9999",
    "DiagnosisTraditionalDesc": "",
    "MethodOfTreatmentCommand": "",
    "ParaClinicalResultCommand": ""
}'::jsonb)
*/
CREATE OR REPLACE FUNCTION badt_dhs.deleteTreatmentProcess(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-09-18 08:25:07
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-07-08
-- Hàm: badt_dhs.deleteTreatmentProcess(input_json JSONB)
-- Mô tả:
--   - PatientCode			Mã số bệnh nhân
--   - MedicalRecordNo			Mã số bệnh án
--   - TPCode	ID diễn biến
-- Sử dụng:
-- Xóa quá trình điều trị từ EMR
-- ===============================================================
-- Biến dùng để gom thông tin trả về cho client
--[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
-- BẮT ĐẦU GIAO DỊCH
-- STEP 1: Kiểm tra chứng từ đã phát thuốc hoặc thu tiền
-- STEP 2: Kiểm tra CLS đã thực hiện hoặc thu tiền
-- STEP 3a: Lấy danh sách chứng từ để xử lý xóa
-- Lặp qua danh sách hàng hóa từ pshdxn tương ứng
-- Cập nhật tồn kho: giảm tamxuat
-- Xóa pshdxn tương ứng
-- Xóa chungtu tương ứng
-- Xóa chidinhcls tương ứng
-- Xóa bnnoitru tương ứng
-- STEP 3b: XÓA QTDIEUTRI
-- HOÀN TẤT
 
  p_mabn TEXT := input_json->>'PatientCode';
  p_makh TEXT := input_json->>'MedicalRecordNo';  
  p_makb TEXT := input_json->>'AdmissionCode';
  p_iddienbien TEXT := input_json->>'TPCode';
  
  p_sohd TEXT := '';

    v_exists           BOOLEAN;
    v_updated_inventory  INT := 0;
    v_deleted_detail     INT := 0;
    v_deleted_header     INT := 0;

    rec RECORD;
    r_ct RECORD;
    r_cls RECORD;
    r_thuoc RECORD;
BEGIN

    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = p_mabn AND makb = p_makb AND maba = p_makh AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            p_mabn, p_makb, p_makh)
        );
    END IF;

    BEGIN
        RAISE NOTICE 'Kiểm tra chứng từ đã phát thuốc hoặc thu tiền';
        IF EXISTS (
            SELECT 1
            FROM current.chungtu
            WHERE mabn = p_mabn 
              AND makh = p_makh 
              AND iddienbien = p_iddienbien
              AND COALESCE(xoa,0) = 0
              AND (COALESCE(dain,0) = 1 OR COALESCE(dathu,0) = 1)
        ) THEN
            RETURN json_build_object(
                'status', 'error',
                'message', 'Không thể xóa tờ điều trị. Chứng từ đã phát thuốc hoặc thu tiền.'
            );
        END IF;

        RAISE NOTICE 'Kiểm tra CLS đã thực hiện hoặc thu tiền';        
        IF EXISTS (
            SELECT 1
            FROM current.chidinhcls
            WHERE mabn = p_mabn 
              AND maba = p_makh 
              AND iddienbien = p_iddienbien
              AND COALESCE(xoa,0) = 0
              AND (COALESCE(dath,0) = 1 OR COALESCE(dathu,0) = 1)
        ) THEN
            RETURN json_build_object(
                'status', 'error',
                'message', 'Không thể xóa tờ điều trị. Có dịch vụ cận lâm sàng đã thực hiện hoặc đã thu tiền.'
            );
        END IF;

        RAISE NOTICE 'Lấy danh sách chứng từ để xử lý xóa';
        FOR r_ct IN
            SELECT mabn, makh, iddienbien, sohd
            FROM current.chungtu
            WHERE mabn = p_mabn 
                AND makh = p_makh 
                AND iddienbien = p_iddienbien
            	AND COALESCE(xoa,0) = 0
        LOOP
            RAISE NOTICE 'Lặp qua danh sách hàng hóa từ pshdxn tương ứng';
            FOR r_thuoc IN
                SELECT hd.sohd, ngayhd, hd.mabn, makh, mahh, giavat, giaban, COALESCE(giabhyt,0) giabhyt, soluong,
					handung, solo, visa, thangkt, namkt, khole
                FROM current.pshdxn hd
                WHERE  hd.sohd        = r_ct.sohd
                  AND  hd.iddienbien  = p_iddienbien
                  AND  hd.mabn        = p_mabn
                  AND  hd.makh        = p_makh
                  AND  COALESCE(xoa,0) = 0    
            LOOP
                RAISE NOTICE 'Cập nhật tồn kho: giảm tamxuat';
                 UPDATE  current.pstonkho
                 SET    tamxuat = tamxuat - r_thuoc.soluong
                 WHERE  mahh     = r_thuoc.mahh
                    AND  giavat::NUMERIC   = r_thuoc.giavat::NUMERIC
                    AND  handung  = r_thuoc.handung
                    AND  solo     = r_thuoc.solo
                    AND  thangkt  = r_thuoc.thangkt
                    AND  namkt    = r_thuoc.namkt
                    AND  khocp    = r_thuoc.khole;

                IF NOT FOUND THEN
                     RETURN json_build_object(
                        'status', 'error',
                        'message', format('Không tìm thấy tồn kho để cập nhật [%]', r_thuoc.mahh)
                    );
                END IF;
            END LOOP;

            RAISE NOTICE 'Xóa pshdxn tương ứng';
            UPDATE current.pshdxn
            SET    xoa = 1, ngayxoa = now()
            WHERE  sohd        = r_ct.sohd
              AND  iddienbien  = p_iddienbien
              AND  mabn        = p_mabn
              AND  makh        = p_makh;

            RAISE NOTICE 'Xóa chungtu tương ứng';
            UPDATE current.chungtu
            SET    xoa = 1, ngayxoa = now()
            WHERE  sohd        = r_ct.sohd
              AND  iddienbien  = p_iddienbien
              AND  mabn        = p_mabn
              AND  makh        = p_makh;
              

              
        END LOOP;

	RAISE NOTICE 'Xóa chidinhcls tương ứng';
	UPDATE current.chidinhcls
	SET    xoa = 1, ngayxoa = now()
	WHERE  iddienbien  = p_iddienbien
	  AND  mabn        = p_mabn
	  AND  maba        = p_makh;

        RAISE NOTICE 'Xóa bnnoitru tương ứng';
        UPDATE current.bnnoitru
        SET    iddienbien = ''
        WHERE  iddienbien  = p_iddienbien
          AND  mabn        = p_mabn
          AND  maba        = p_makh;
          
        RAISE NOTICE 'Xóa QTDIEUTRI tương ứng';
        DELETE FROM current.qtdieutri
        WHERE iddienbien  = p_iddienbien
              AND mabn        = p_mabn
              AND maba        = p_makh;
		/*
        IF NOT FOUND THEN
            RETURN json_build_object(
            'status', 'error',
            'message', 'Không tìm thấy dữ liệu trong qtdieutri.'
        );
        END IF;
		*/
        RAISE NOTICE 'HOÀN TẤT';
        RETURN json_build_object(
            'status', 'success',
            'message', format('Đã xóa quá quá trình điều trị %s.', p_iddienbien)
        );

    EXCEPTION 
    	WHEN OTHERS THEN
        RAISE NOTICE 'LỖI';
        RETURN jsonb_build_object(
            'status' , 'error',
            'message', SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;


`
  },
  "badt_dhs.DiagnoseProcess": {
    name: "badt_dhs.DiagnoseProcess",
    para: ["p_json"],
    returns: "JSON",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.DiagnoseProcess(
    p_json jsonb
)
RETURNS JSON AS
$$
DECLARE
-- Lastest commit: author:nqhoa1005; date: 2025-11-05 09:06:28
	v_mabn TEXT         := p_json->>'PatientCode';
    v_makb TEXT         := p_json->>'AdmissionCode';
    v_maba TEXT         := p_json->>'MedicalRecordNo';
    v_macls TEXT       := p_json->>'MedSerCode';
    v_ngaykcb TIMESTAMP := (p_json->>'NgayChiDinh')::timestamp;
    v_namkt TEXT        := p_json->>'NamKT';
    v_thangkt TEXT      := p_json->>'ThangKT';
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'TPCode',             COALESCE(cd.iddienbien,''),
        'ParaClinReqCode',    COALESCE(cd.idchidinh,''),
        'PCReqDltVoucherNo',  cd.idchidinh||cd.macls,
        'PatientCode',        cd.mabn,
        'AdmissionCode',      cd.makb,
        'MedicalRecordNo',    COALESCE(cd.maba,''),
        'OrderNo',            1,
        'MedSerCode',         cd.macls,
        'MedSerName',         dm.tencls,
        'UOMID',              NULL,
        'UOMCode',            NULL,
        'UOMName',			  dm.dvt,
        'ParaClinQty',        cd.soluong,
        'PCReqDtlNotes',      '',
        'NgayChiDinh',        to_char(cd.ngaykcb, 'YYYY-MM-DD HH24:MI:SS'),
        'NgayThucHien',       to_char(cd.giolaymau, 'YYYY-MM-DD HH24:MI:SS'),
        'NgayKetQua',         to_char(ha.ngaycd, 'YYYY-MM-DD HH24:MI:SS'),
        'MaMayThucHien',      COALESCE(ha.mamay,''),
        'MaDonViThucHien',    COALESCE(ha.madv,''),
        'MaPhongThucHien',    COALESCE(ha.maphong,''),
        'MaNhanVienThucHien', COALESCE(nv.manv,''),
        'MaNhanVienTraKQ',    COALESCE(ha.manv,''),
        'KetLuan',            COALESCE(ha.ketluan_plaintext,''),
        'MoTa',               COALESCE(ha.mota_text,''),
        'GhiChu',             COALESCE(ha.loidan,'')
    )
    INTO v_result
    FROM current.pskhamha ha
    INNER JOIN CURRENT.chidinhcls cd ON cd.macls = ha.macls AND cd.mabn = ha.mabn AND cd.makb = ha.makb AND COALESCE(cd.maba,'') = COALESCE(ha.maba,'')
    LEFT JOIN CURRENT.dmcls dm ON dm.macls = ha.macls
    LEFT JOIN CURRENT.dmnhanvien nv ON COALESCE(TRIM(nv.macc_hanhnghe_cv2348),'') = COALESCE(TRIM(cd.nguoi_thuc_hien),'')
    WHERE cd.xoa = 0
      AND ha.mabn = v_mabn
      AND ha.makb = v_makb
      AND COALESCE(ha.maba,'') = v_maba	  
      AND ha.macls = v_macls
      AND ha.ngaykcb = v_ngaykcb
      AND cd.namkt = v_namkt
      AND cd.thangkt = v_thangkt;
    RETURN COALESCE(v_result, '{}'::json);
END;
$$ LANGUAGE plpgsql;



`
  },
  "badt_dhs.getDMGiuong": {
    name: "badt_dhs.getDMGiuong",
    para: ["p_json"],
    returns: "JSON",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.getDMGiuong(p_json JSONB)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-11-07 13:59:29
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-11-05
-- Cải tiến: 2025-11-06
-- Hàm: badt_dhs.getDMGiuong(p_json JSONB)
-- Mô tả: Danh mục giường bệnh còn trống và chính bệnh nhân đó sử dụng
--
-- Sử dụng:
--   SELECT badt_dhs.getDMGiuong('{"PatientCode":"2025029956","MedicalRecordNo":"2025010963","DepartmentCode":"07"}'::jsonb);
--[ÔNG TRIỆU HẬU: 2025-11-06: 19:10] Xử lý gom gọn code và trả về theo cấu trúc đã gửi đối tác, và tầng NodeJS
-- Lấy cấu hình hệ thống
-- Kiểm tra cấu hình và lấy dữ liệu tương ứng
-- Chỉ lấy giường trống hoặc đã ra viện
-- Lấy tất cả giường
-- Kiểm tra dữ liệu và tạo kết quả
  v_result      JSON;
  v_data        JSON;
  v_mabn        TEXT := COALESCE(p_json->>'PatientCode', '');
  v_maba        TEXT := COALESCE(p_json->>'MedicalRecordNo', '');
  v_madv        TEXT := COALESCE(p_json->>'DepartmentCode', '');
  v_nt_magiuong NUMERIC := 0;
BEGIN
  SELECT giatri INTO v_nt_magiuong 
  FROM current.system 
  WHERE tents = 'nt.magiuong';

  IF v_nt_magiuong = 2 THEN
    WITH dmgiuong_all AS (
      SELECT 
        gi.ma_giuong,
        gi.diengiai,
        gi.loai,
        '' AS mabn,
        '' AS maba
      FROM current.dmgiuongbenh gi
      LEFT JOIN current.bnnoitru nt ON nt.sogiuong = gi.ma_giuong 
          AND COALESCE(nt.ravien, 0) = 0 
          AND COALESCE(nt.namvien, 0) = 1 
          AND nt.madv = v_madv
      WHERE gi.madv = v_madv
        AND COALESCE(gi.sudung, 0) = 0
        AND (
          COALESCE(gi.mabn, '') || COALESCE(nt.mabn, '') = ''
          OR
          COALESCE(gi.mabn, '') || COALESCE(gi.maba, '') = v_mabn || v_maba
          OR
          COALESCE(nt.mabn, '') || COALESCE(nt.maba, '') = v_mabn || v_maba
        )
    )
    SELECT json_agg(
      json_build_object(
        'BedNo', ma_giuong,
        'BedName', diengiai,
        'BedType', loai,
        'PatientCode', mabn,
        'MedicalRecordNo', maba
      ) ORDER BY ma_giuong
    ) INTO v_data
    FROM dmgiuong_all;

  ELSE
    SELECT json_agg(
      json_build_object(
        'BedNo', gi.ma_giuong,
        'BedName', gi.diengiai,
        'BedType', gi.loai,
        'PatientCode', gi.mabn,
        'MedicalRecordNo', gi.maba
      ) ORDER BY gi.ma_giuong
    ) INTO v_data
    FROM current.dmgiuongbenh gi
    WHERE gi.madv = v_madv
      AND COALESCE(gi.sudung, 0) = 0;

  END IF;

  IF v_data IS NULL OR json_array_length(v_data) = 0 THEN
    v_result := json_build_object(
      'status', 'error',
      'message', 'Không tồn tại giường trống',
      'count', 0,
      'data', '[]'::json
    );
  ELSE
    v_result := json_build_object(
      'status', 'success',
      'message', 'Success',
      'count', json_array_length(v_data),
      'data', v_data
    );
  END IF;

  RETURN v_result;
END;
$$;


`
  },
  "badt_dhs.getInventory": {
    name: "badt_dhs.getInventory",
    para: ["mahh","khocp","thangkt","namkt"],
    returns: "text",
    codesql: `



CREATE OR REPLACE FUNCTION badt_dhs.getInventory(mahh TEXT, khocp TEXT, thangkt TEXT, namkt TEXT)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:Nguyễn Triều Vương; date: 2025-06-17 15:00:42
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-06-17
-- Hàm: badt_dhs.getInventory(mahh TEXT DEFAULT NULL, khocp TEXT, thangkt TEXT, namkt TEXT)
-- Mô tả:
--   - Nếu mahh IS NULL hoặc rỗng ('')     => lấy toàn bộ dữ liệu, theo thangt, namkt
--
-- Sử dụng:
--   SELECT badt_dhs.getInventory('','02','05','2025');        -- Lấy toàn bộ tồn kho theo kho cấp phát 02 tháng 05/2025
--   SELECT badt_dhs.getInventory('A02','02','05','2025');     -- Lấy tồn kho, mahh='A02', theo khocp 02 tháng 05/2025
-- ===============================================================
  result text;
  p_mahh ALIAS FOR mahh;
  p_khocp ALIAS FOR khocp;
  p_thangkt ALIAS FOR thangkt;
  p_namkt ALIAS FOR namkt;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
        SELECT tk.mahh as InvCode, --mahh
         th.tenhh as InvName, --tenhh 
         th.tenhc as ActiveIngredient, --Hoạc chất
         th.hamluong as DrugContent, -- Hàm lượng
         th.dvt as UOMCode, --dvt, 
         tk.giavat as PriceVAT, --giá vat, 
         tk.giaxuat as Price, -- giá xuất, 
         tk.giabhyt as PriceHI, --giá bh  , 
         tk.handung as expDate, --Hạn dùng 
         tk.visa, 
         tk.solo as lotNumber, -- Số lô 
         tk.toncuoi as Stock, --tồn kho (tồn cuối) 
         k.bhyt as IsHI, --thanh bh: 0 không thanh, 1: thanh 
         tk.khocp as StoreHouseCode, --mã khoa (khocp)
         tk.madv as CabinetCode, --Mã tủ trực (madv)
         tk.thangkt as sMonth, --Tháng kết toán 
         tk.namkt as sYear --Năm kế toán
        FROM current.pstonkho tk
            INNER JOIN current.dmthuoc th ON tk.mahh = th.mahh
            INNER JOIN current.dmkho k ON tk.mahh = k.mahh
        WHERE (p_mahh IS NULL OR p_mahh = '' OR tk.mahh = p_mahh)
              AND tk.khocp = p_khocp
              AND tk.thangkt = p_thangkt
              AND tk.namkt = p_namkt
              AND COALESCE(tk.uutien,'') != '2'
              AND COALESCE(tk.toncuoi,0) > 0
        ORDER BY tk.mahh, tk.handung, tk.uutien
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.getInventoryMedicalRecordNo": {
    name: "badt_dhs.getInventoryMedicalRecordNo",
    para: ["mahh","mabn","maba","IsTuTruc","IsNhaThuoc","IsDongYThanhPham","IsDongYThuocThang"],
    returns: "text",
    codesql: `



CREATE OR REPLACE FUNCTION badt_dhs.getInventoryMedicalRecordNo(mahh TEXT,mabn TEXT, maba TEXT, IsTuTruc BOOLEAN, IsNhaThuoc BOOLEAN, IsDongYThanhPham BOOLEAN, IsDongYThuocThang BOOLEAN)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-09-20 16:16:33
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-06-17
-- Hàm: badt_dhs.getInventoryMedicalRecordNo(mahh TEXT DEFAULT NULL, mabn TEXT, maba TEXT)
-- Mô tả:
--   - Nếu mahh IS NULL hoặc rỗng ('')     => lấy toàn bộ dữ liệu, theo khocp, thangt, namkt: lấy từ bnnoitru, dmdoituongkhocp và system
--
-- Sử dụng:
--   SELECT badt_dhs.getInventoryMedicalRecordNo('','2023031755','017517');        -- Lấy toàn bộ tồn kho
--   SELECT badt_dhs.getInventoryMedicalRecordNo('3B08','2023031755','017517');     -- Lấy tồn kho, theo mahh='3B08'
-- ===============================================================
--Thêm chức năng lấy kho Đông y Thuốc thang, tạo sẵn, chưa xử lý
-- Lấy madt
--NTVUONG 2025-08-25 : Kiểm tra thông tin bệnh
-- Xử lý trường hợp p_isDongYThuocThang = true trả về dữ liệu trống
-- Lấy khocp theo đối tượng
-- ÔNG TRIỆU HẬU - 2025-09-08 : Lấy khocp cho Đông y Thành phẩm
-- => Không còn phù hợp, trường hợp Vĩnh Thạnh, lấy sai kho 01: nhưng cấu hình máy dongy=1
-- SELECT khocp INTO khocp_dt FROM current.dmkhocp WHERE loai = 2 AND dongy = 1 LIMIT 1;
-- ÔNG TRIỆU HẬU - 2025-09-20 : Lấy theo Cấu hình máy của Treatment, lấy cùng khoa với bệnh nhân,
--  có cấu hình Đông Y để ra toa
-- [ÔNG TRIỆU HẬU - 2025-09-08] : Kiểm tra nếu không tìm thấy khocp thì trả về dữ liệu trống
-- ![](https://live.staticflickr.com/65535/54780372742_70d29647db_b.jpg)
-- Logic gốc cho các trường hợp khác
-- -- Lấy khocp theo đối tượng
-- SELECT khocp INTO khocp_dt FROM current.dmdoituongkhocp WHERE madt= madt_nt and (noitru = 1 or noitru = 2) ORDER BY noitru LIMIT 1;    
-- Lấy list mã tủ trực thuộc khoa
--NQHOA 2025-07-25 : đổ kết quả tủ trực thuộc bnnoitru.madv 
--                   để tìm kiếm tồn kho nếu lấy thuốc từ tủ trực (IsTuTruc = true)
-- Kiểm tra và xử lý trường hợp không có dữ liệu
-- Lấy tháng/năm kế toán
--[ÔNG TRIỆU HẬU - 2025-08-04]: Chỉnh COALESCE để tránh kết quả null
--[ÔNG TRIỆU HẬU 2025-07-14]: Chỉ loại trừ 04, VTYT ![](https://staging-jubilee.flickr.com/65535/54660882369_0996f0311b_c.jpg)
--[ÔNG TRIỆU HẬU: 2025-09-15] Xử lý lại các điều kiện để phù hợp với Param truyền vào
--https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/23
-- AND (
--   	  p_istutruc = FALSE AND p_isnhathuoc = FALSE AND COALESCE(tk.khocp, '') = COALESCE(khocp_dt, '')
--         OR p_istutruc = TRUE AND (COALESCE(tk.khocp, '') = '') AND (COALESCE(tk.madv, '') = ANY(kho_tutruc))		--NQHOA 2025-07-25 : Bổ sung kiểm tra nếu lấy thuốc từ tủ trực sẽ where theo madv
--         OR p_istutruc = FALSE AND p_isnhathuoc = TRUE AND (COALESCE(tk.khocp, '') = '13')
-- 	  )	
  result text;
  p_mahh ALIAS FOR mahh;
  p_mabn ALIAS FOR mabn;
  p_maba ALIAS FOR maba;
  p_istutruc ALIAS FOR IsTuTruc;		                --NQHOA 2025-07-25 : bổ sung nhận biết lấy thuốc từ tủ trực => ưu tiên nếu p_istutruc = true
  p_isnhathuoc ALIAS FOR IsNhaThuoc;	              --NQHOA 2025-07-25 : bổ sung nhận biết lấy thuốc từ nhà thuốc => IsTuTruc = false và IsNhaThuoc = true
  p_isDongYThanhPham ALIAS FOR IsDongYThanhPham;	  --ÔNG TRIỆU HẬU - 2025-09-08 : Thêm chức năng lấy kho Đông y Thành phẩm
  p_isDongYThuocThang ALIAS FOR IsDongYThuocThang;	--ÔNG TRIỆU HẬU - 2025-09-08 : 

  								
  madt_nt TEXT;
  madv_nt TEXT;
  maicd_nt TEXT;
  kqcdoan_nt TEXT;
  maicdp_nt TEXT;
  kqcdoanp_nt TEXT;

  thangnam TEXT;
  thangkt_S TEXT; 	-- thangkt, lấy cho đủ số liệu, toa thuốc mới lên module
  namkt_S TEXT; 	--namkt, lấy cho đủ số liệu, toa thuốc mới lên module

  khocp_dt TEXT; 	--khocp theo đối tượng
  kho_tutruc TEXT[]; --kho tủ trực
BEGIN
    SELECT madt, madv, maicd, kqcdoan, maicdp, kqcdoanp INTO madt_nt, madv_nt, maicd_nt, kqcdoan_nt, maicdp_nt, kqcdoanp_nt -- lấy cho đủ số liệu
    FROM current.bnnoitru nt
    WHERE nt.mabn = p_mabn AND nt.maba = p_maba
	  LIMIT 1 ;

    IF NOT FOUND THEN
       RETURN json_build_object(
            'status', 'error',
            'message', format('Không tìm thấy bệnh nhân với PatientCode = %s, MedicalRecordNo = %s', p_mabn, p_maba)
       )::text;
    END IF;

    IF p_isDongYThuocThang = TRUE THEN
        RETURN '[]'::text;
    END IF;
    

    IF p_isDongYThanhPham = TRUE THEN
        SELECT DISTINCT msdvcp INTO khocp_dt FROM current.cauhinhmay 
        WHERE module='Treatment' AND COALESCE(dongycapcuu,0)=1 AND COALESCE(msdvcp,'')<>''
          AND madv=madv_nt LIMIT 1;

        IF khocp_dt IS NULL THEN
            RETURN '[]'::text;
        END IF;
    ELSE
        SELECT khocp INTO khocp_dt FROM current.dmdoituongkhocp WHERE madt= madt_nt and (noitru = 1 or noitru = 2) ORDER BY noitru LIMIT 1;
    END IF;
    
    IF p_istutruc = TRUE THEN 
      SELECT array_agg(madv)::TEXT[] INTO kho_tutruc				                                                                  
		  FROM current.dmdonvi 
		  WHERE loaidv = 3 AND COALESCE(vietngan, '') = madv_nt;

      IF kho_tutruc IS NULL OR array_length(kho_tutruc, 1) IS NULL THEN
          RETURN '[]'::text;
      END IF;
    END IF;

    SELECT giatri INTO thangnam FROM current.system WHERE tents = 'thanglv';
    thangkt_S := SPLIT_PART(thangnam, '/', 1);
    namkt_S := SPLIT_PART(thangnam, '/', 2);

  

  SELECT json_agg(row_data)::text
  INTO result
  FROM (
        SELECT tk.mahh, --as InvCode, --mahh
         th.tenhh,-- as InvName, --tenhh
         th.tenhc,-- as ActiveIngredient, --Hoạc chất
         th.hamluong,-- as DrugContent, -- Hàm lượng
         th.dvt,-- as UOMCode, --dvt,
         tk.giavat,-- as PriceVAT, --giá vat,
         tk.giaxuat,-- as Price, -- giá xuất,
         tk.giabhyt,-- as PriceHI, --giá bh  ,
         tk.handung,-- as expDate, --Hạn dùng
         tk.visa,
         tk.solo,-- as lotNumber, -- Số lô
         tk.toncuoi - COALESCE(tk.tamxuat,0) as toncuoi,-- as Stock, --tồn kho (tồn cuối) --NQHOA 2025-07-25 : điều chỉnh trả về tồn kho đã trừ tạm xuất
         COALESCE(k.bhyt,0) AS bhyt,-- as IsHI, --thanh bh: 0 không thanh, 1: thanh
         COALESCE(tk.khocp,'') AS khocp, -- as StoreHouseCode, --mã khoa (khocp)
         COALESCE(tk.madv,'') AS madv,-- as CabinetCode, --Mã tủ trực (madv)
         tk.thangkt,-- as sMonth, --Tháng kết toán
         tk.namkt-- as sYear --Năm kế toán
        FROM current.pstonkho tk
            INNER JOIN current.dmthuoc th ON tk.mahh = th.mahh
            INNER JOIN current.dmkho k ON tk.mahh = k.mahh
            INNER JOIN current.dmloaikhoql lk ON th.kho = lk.kho AND lk.kho <> '04' --[ÔNG TRIỆU HẬU 2025-07-14: Thêm các kho khác: '05','06','09' ] ![](https://live.staticflickr.com/65535/54653345774_6b2e64fccd_b.jpg)
        WHERE (COALESCE(p_mahh,'')='' OR tk.mahh = p_mahh)              
              AND tk.thangkt = thangkt_S
              AND tk.namkt = namkt_S
              AND COALESCE(tk.uutien,'') != '2'
              AND (COALESCE(tk.toncuoi,0) - COALESCE(tk.tamxuat,0)) > 0
              AND CASE WHEN p_istutruc = TRUE THEN
                            COALESCE(tk.khocp, '') = '' AND COALESCE(tk.madv, '') = ANY(kho_tutruc)
                       WHEN p_isnhathuoc = TRUE THEN
                            COALESCE(tk.khocp, '') = '13'
                       ELSE --Đã xử lý p_isDongYThanhPham, p_isDongYThuocThang vào biến khocp_dt
                            COALESCE(tk.khocp, '') = COALESCE(khocp_dt, '') 
                  END  
            	   
        ORDER BY tk.mahh, tk.handung, tk.uutien
  ) AS row_data;
  RETURN result;
END;
$$;




`
  },
  "badt_dhs.getSyncMedicalServiceItem": {
    name: "badt_dhs.getSyncMedicalServiceItem",
    para: ["macls"],
    returns: "text",
    codesql: `




CREATE OR REPLACE FUNCTION badt_dhs.getSyncMedicalServiceItem(macls text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:nkduyt25013; date: 2026-03-31 15:46:23
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getSyncMedicalServiceItem(macls TEXT DEFAULT NULL)
-- Mô tả: Danh mục CLS
--   - Nếu macls IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu macls có giá trị cụ thể          => lọc theo maloai
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncMedicalServiceItem();        -- Trả toàn bộ CLS
--   SELECT badt_dhs.getSyncMedicalServiceItem('');      -- Trả toàn bộ CLS
--   SELECT badt_dhs.getSyncMedicalServiceItem('XN');   -- Chỉ loại CLS mã 'XN'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/TMMk33ZZ/e-MJQT7-Va1o.png)
--[ÔNG TRIỆU HẬU: 2025-08-09] Nếu tt37 khác 1 thì Khóa lại
--https://docs.google.com/spreadsheets/d/1guIZ-cWoBRHd_9Kmv0G2gK82LvGR_VZEed0s6VybRq4/edit?gid=0#gid=0
  result text;
  p_macls ALIAS FOR macls;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      cls.macls AS "MedSerCode",                  																-- Mã dịch vụ
      CASE WHEN cls.kho IN ('MU','PT','TT','XN','OX','HA','CN') THEN cls.maloai ELSE cls.maloai END AS "MSTypeCode",   	-- Mã loại
      cls.tencls AS "MedSerName",																				-- Tên dịch vụ
      CASE WHEN (cls.sudung = 1 AND COALESCE(tt37,0)=1) THEN FALSE ELSE TRUE END AS "IsBlocked", -- Khoá
      COALESCE(cls.thuchien, 0) AS "IsResultRequired", --[Nguyễn Khắc Duy: 2026-03-31] Bổ sung trường IsResultRequired để xác định cls có yêu cầu trả kết quả trước khi chỉ định mới
      COALESCE(cls.bhyt,0) AS "IsHI", --[ÔNG TRIỆU HẬU - 2025-07-09] EMR có yêu cầu bổ sung IsHI để nhận diện đối tượng Dịch vụ, 
      COALESCE(cls.tt37,0) AS TT37 --[ÔNG TRIỆU HẬU: 2025-08-09] Thêm dấu hiệu để biết TT37
    FROM current.dmcls cls 
    WHERE
     p_macls IS NULL OR p_macls = '' OR cls.macls = p_macls
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.getSyncMedSerType": {
    name: "badt_dhs.getSyncMedSerType",
    para: ["maloai"],
    returns: "text",
    codesql: `




CREATE OR REPLACE FUNCTION badt_dhs.getSyncMedSerType(maloai text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-08-16 14:33:07
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getSyncMedSerType(maloai TEXT DEFAULT NULL)
-- Mô tả: Danh mục loại CLS
--   - Nếu maloai IS NULL hoặc rỗng ('')     => trả toàn bộ dữ liệu
--   - Nếu maloai có giá trị cụ thể          => lọc theo maloai
--
-- Sử dụng:
--   SELECT badt_dhs.getSyncMedSerType();        -- Trả toàn bộ loại CLS
--   SELECT badt_dhs.getSyncMedSerType('');      -- Trả toàn bộ loại CLS
--   SELECT badt_dhs.getSyncMedSerType('XN');   -- Chỉ loại CLS mã 'XN'
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/LDzhJGgx/LUt-Z5-CLm-QR.png)
--MAU - Máu
--PTTT - Phẫu thuật/ thủ thuật
--XN - Xét nghiệm
--OXY - Ô xy
--CDHA - Chẩn đoán hình ảnh
--VLTL - Vật lý trị liệu
--CCUU - Châm cứu
--HC - Hội chẩn
--TDCN - Thăm dò chắc năng
--loai.kho NOT IN ('KB','CV','CV2','DV','GB','SO')
  result text;
  p_maloai ALIAS FOR maloai;
BEGIN
  SELECT json_agg(row_data)::text
  INTO result
  FROM (
    SELECT
      NULL AS "PMSTypeCode",						--Mã Cha
      loai.maloai AS "MSTypeCode",                  -- Mã loại
      loai.tenloai AS "MSTypeName",                 	-- Tên loại
      FALSE AS "IsBlocked",	     					-- Khoá
      CASE  WHEN loai.kho = 'MU' THEN 'MAU'
      		  WHEN loai.kho IN ('PT','TT')  THEN 'PTTT'
            WHEN loai.kho = 'XN' THEN 'XN'
            WHEN loai.kho = 'OX' THEN 'OXY'
            WHEN loai.kho = 'HA' THEN 'CDHA'
            WHEN loai.kho = 'CN' THEN 'TDCN'
			      ELSE '' END AS "V_ServiceKind" 			--Nhóm :
    FROM current.dmloaicls loai
    WHERE
     p_maloai IS NULL OR p_maloai = '' OR loai.maloai = p_maloai
  ) AS row_data;
  RETURN result;
END;
$$;

`
  },
  "badt_dhs.InsertCUTPParaClinRequest": {
    name: "badt_dhs.InsertCUTPParaClinRequest",
    para: ["p_json"],
    returns: "JSONB",
    codesql: `






CREATE OR REPLACE FUNCTION badt_dhs.InsertCUTPParaClinRequest(p_json JSONB)
RETURNS JSONB AS
$$
DECLARE
-- Lastest commit: author:nkduy1512; date: 2026-05-12 09:05:48
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-06-11
-- Hàm: badt_dhs.InsertCUTPParaClinRequest(p_json JSONB)
-- Mô tả: nhận json DHS insert vào chidinhcls
-- ===============================================================
--Các trường đang bỏ trống :
--taikhoan (chưa có field từ json truyền vào)
--tenmay (chưa có field từ jsontruyền vào)
--toacon (chưa có field từ jsontruyền vào)
--macon (chưa có field từ jsontruyền vào)
-- ===============================================================
-- Biến kiểm tra ICD 
-- Biến lưu cls vi phạm điều kiện thời gian chỉ định
--[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
--Lấy thông tin bệnh nhân
--[ÔNG TRIỆU HẬU: 2025-10-24]: Bổ sung ngayvv để kiểm tra ở các bước sau. https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/66
--[ÔNG TRIỆU HẬU: 2025-09-10] Kiểm tra tồn tại macls
--Lấy thông tin điều trị
--[ntvuong: 2025-10-01] Kiểm tra ngày thuộc tháng kế toán
---------------------------------------------------------------------
-- [NQHOA: 2025-10-16] kiểm tra cls có ngày chỉ định nhỏ hơn ngày vào viện
---------------------------------------------------------------------
---------------------------------------------------------------------
-- [NKDUY: 2026-05-07] Kiểm tra ràng buộc số ngày chỉ định cls cho đối tượng BHYT
---------------------------------------------------------------------
-- r_bnnoitru.bhyt đã được select từ dmdoituong ở trên, nên chỉ cần kiểm tra bhyt IN (1,2)
-- xác định số tháng tối đa cần tìm ngược
-- Xác định filter tìm kiếm (mathe hoặc cmnd)
-- Ko có mathe thì gom tất cả các mabn cùng 1 người
-- log mã cmnd ra xem
--RAISE NOTICE 'CMND: %', v_cmnd;
-- Chỉ cần 1 cls vi phạm là dừng ngay
-- RAISE NOTICE 'CLS %:[%] có ngày chỉ định gần nhất là % vi phạm quy định số ngày chỉ định liên tiếp là % ngày. Không thể thêm mới.', v_vi_pham.macls, v_vi_pham.tencls, v_vi_pham.ngaykcb, v_vi_pham.songay;
---------------------------------------------------------------------
-- [NQHOA: 2025-10-15] kiểm tra cls có cấu hình thực hiện, đã chỉ định trước đó nhưng chưa có kết quả không cho chỉ định mới
---------------------------------------------------------------------
--[ÔNG TRIỆU HẬU: 2025-11-19] Kiểm tra thêm COALESCE(cd.dalappttt,0)=0
--[ÔNG TRIỆU HẬU: 2025-11-19] Kiểm tra thêm COALESCE(cd.dalappttt,0)=0
---------------------------------------------------------------------
--Group các CLS cha gôm tổng số lượng
--[NQHOA 2025-12-19] Fix lỗi các CLS có giờ phút chỉ định = 00:00:00 khi ghép giờ hiện tại của server có miliseconds gây ra lỗi khi thực hiện báo CLS đã xoá
--Thêm các CLS con, dùng cùng số lượng với CLS cha
--Kiểm tra CLS đã xoá từ EMR
--Kiểm tra CLS thay đổi thông tin
--Cập nhật lại các CLS đã xoá từ EMR
--Tạo bảng đầy đủ dữ liệu đã group có cả cha và con
--[NQHOA: 2025-10-02] LẤY THÊM THÔNG TIN THẺ 2 ĐỂ GÁN VÀO chidinhcls : toacon, macon và mathe
--UPDATE các dòng đã có
--[NQHOA: 2025-10-02] Cập nhật lại thông tin CLS vào thẻ 2 nếu có
--INSERT các dòng mới
    v_tpcode TEXT := TRIM(p_json->>'TPCode');
    v_admissioncode TEXT := TRIM(p_json->>'AdmissionCode');
    v_medicalrecordno TEXT := TRIM(p_json->>'MedicalRecordNo');
    v_paraclinreqcode TEXT := TRIM(p_json->>'ParaClinReqCode');
    v_patientcode TEXT := TRIM(p_json->>'PatientCode');
    v_employeecode TEXT := TRIM(p_json->>'EmployeeCode');

    r_bnnoitru RECORD;
    r_qtdieutri RECORD;
    sys_laygiadan TEXT;
    sys_laygiadv TEXT;

    missing_icds TEXT[];
    Para JSONB;
    Para_item JSONB;
    From_Date date;

    v_vi_pham_thang TEXT[];
    v_vi_pham RECORD;
    v_cmnd TEXT;
    v_mabn_list TEXT[];
    v_filter_mathe TEXT;
    v_thang_check NUMERIC;
    v_nam_check NUMERIC;
    v_max_songay NUMERIC;
    i INT;
BEGIN

    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = v_patientcode AND makb = v_admissioncode AND maba = v_medicalrecordno AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            v_patientcode, v_admissioncode, v_medicalrecordno)
        );
    END IF;

    SELECT nt.madt, nt.madv, nt.mathe, dt.bhyt, nt.tinhtrangvv, 
    		COALESCE(bn.gioitinh,0)::NUMERIC AS gioitinh, 
            COALESCE(t2.maba,'') AS ttcon, COALESCE(t2.mathe) AS mathe2, nt.thangkt, nt.namkt,
            nt.ngayvv
    INTO r_bnnoitru
    FROM current.bnnoitru nt
    LEFT JOIN current.dmdoituong dt ON dt.madt = nt.madt
    LEFT JOIN current.dmbenhnhan bn ON bn.mabn = nt.mabn
    LEFT JOIN current.ttcon t2 ON t2.mabnme = nt.mabn AND t2.makbme = nt.makb AND t2.mabame = nt.maba AND t2.maba LIKE '%.BH2'
    WHERE nt.ravien = 0
      AND TRIM(nt.mabn) = v_patientcode
      AND TRIM(nt.makb) = v_admissioncode
      AND TRIM(nt.maba) = v_medicalrecordno;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Không tìm thấy thông tin bệnh nhân');
    END IF;

    IF p_json ? 'ParaClinRequests' AND jsonb_array_length(p_json->'ParaClinRequests') > 0 THEN
        
        WITH dx AS (
            SELECT DISTINCT
                   (d->>'MedSerCode')::text AS macls_code
            FROM jsonb_array_elements(p_json->'ParaClinRequests') AS d
            WHERE NULLIF(d->>'MedSerCode','') IS NOT NULL
        ),
        missing AS (
            SELECT dx.macls_code
            FROM dx
            LEFT JOIN current.dmcls m
                   ON m.macls = dx.macls_code AND COALESCE(m.sudung,0)=1 AND COALESCE(m.tt37,0)=1
            WHERE m.macls IS NULL
        )
        SELECT ARRAY_AGG(macls_code)
        INTO missing_icds
        FROM missing;

        IF missing_icds IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 
                format('MedSerCode code không tồn tại hoặc ngưng sử dụng trong current.dmcls: %L', missing_icds));
        END IF;

    END IF;
    
    

    SELECT qt.iddienbien, qt.madv, qt.maphong, qt.maicd, qt.kqcdoan, qt.maicdp, qt.kqcdoanp,
           qt.mayhct, qt.tenyhct, qt.thangkt, qt.namkt, qt.sogiuong, qt.ngaygio, qt.manv, nv.taikhoan
    INTO r_qtdieutri
    FROM current.qtdieutri qt
    LEFT JOIN current.dmnhanvien nv ON nv.manv = qt.manv
    WHERE qt.iddienbien = v_tpcode;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Không tìm thấy thông tin điều trị');
    END IF;

    Para := p_json->'ParaClinRequests';
    FOR idx IN 0 .. jsonb_array_length(Para) - 1 LOOP
          Para_item := Para->idx;
          From_Date := (Para_item->>'FromDate')::timestamp::date;
		  
          IF NOT EXISTS (
            SELECT 1 FROM current.thangkt
            WHERE thangkt = r_qtdieutri.thangkt
                 AND namkt = r_qtdieutri.namkt
                 AND From_Date::DATE BETWEEN ngaybd::DATE AND ngaykt::DATE
          ) THEN
              RETURN json_build_object(
                  'status', 'error',
                  'message', format('FromDate: %s không thuộc tháng kế toán %s/%s.',From_Date,r_qtdieutri.thangkt,r_qtdieutri.namkt)
                  );
          END IF;
    END LOOP;

        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)            
            WHERE r_bnnoitru.ngayvv::TIMESTAMP > (j.item->>'FromDate')::TIMESTAMP
        ) THEN
            RETURN jsonb_build_object(
                'status','error',
                'message','CLS có ngày chỉ định nhỏ hơn ngày nhập viện. Không thể thêm.',
                'MedSerCode', COALESCE((
                    SELECT jsonb_agg(DISTINCT (j.item->>'MedSerCode'))
                    FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)                    
                    WHERE r_bnnoitru.ngayvv::TIMESTAMP > (j.item->>'FromDate')::TIMESTAMP
                ), '[]'::jsonb)
            );
        END IF;
    
    IF COALESCE(r_bnnoitru.bhyt, 0) IN (1, 2) THEN
        CREATE TEMP TABLE tmp_cls_songay ON COMMIT DROP AS -- Tạo bảng tạm chỉ chứa các CLS có số ngày quy định lớn hơn 0
        SELECT
            dm.macls,
            dm.tencls,
            dm.songay,
            (j.item->>'FromDate')::DATE AS from_date
        FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)
        JOIN current.dmcls dm ON dm.macls = (j.item->>'MedSerCode')
        WHERE COALESCE(dm.songay, 0) > 0
            AND dm.bhyt = 1; -- Chỉ áp dụng kiểm tra số ngày cho cls được bhyt thanh toán

        IF EXISTS (SELECT 1 FROM tmp_cls_songay) THEN -- Nếu có CLS nào có quy định số ngày, mới thực hiện kiểm tra
            SELECT MAX(songay) 
            INTO v_max_songay 
            FROM tmp_cls_songay;

            IF COALESCE(r_bnnoitru.mathe, '') != '' THEN
                v_filter_mathe := r_bnnoitru.mathe;
                v_mabn_list := NULL;
            ELSE
                v_filter_mathe := NULL;
                SELECT TRIM(bn.cmnd) -- ràng trước trường hợp cmnd có khoảng trắng
                INTO v_cmnd
                FROM current.dmbenhnhan bn
                WHERE bn.mabn = v_patientcode
                    AND NULLIF(TRIM(bn.cmnd), '') IS NOT NULL;

                IF v_cmnd IS NOT NULL THEN
                    SELECT ARRAY_AGG(DISTINCT TRIM(bn.mabn))
                    INTO v_mabn_list
                    FROM current.dmbenhnhan bn
                    WHERE TRIM(bn.cmnd) = v_cmnd;
                    IF v_mabn_list IS NULL THEN
                        v_mabn_list := ARRAY[v_patientcode]; -- Phòng trường hợp lỗi truy vấn dẫn đến không có mabn nào được trả về
                    END IF;
                ELSE -- Nếu không có cmnd thì chỉ kiểm tra theo mabn hiện tại
                    v_mabn_list := ARRAY[v_patientcode];
                END IF;
            END IF;

            v_thang_check := r_bnnoitru.thangkt;
            v_nam_check := r_bnnoitru.namkt;

            CREATE TEMP TABLE tmp_thang_nam ON COMMIT DROP AS
            SELECT ''::TEXT AS thangkt, ''::TEXT AS namkt
            WHERE FALSE; -- Tạo bảng tạm để lưu các tháng/năm cần check

            FOR i IN 0 .. LEAST(CEIL(v_max_songay::FLOAT / 28), 6)
            LOOP
                INSERT INTO tmp_thang_nam (thangkt, namkt)
                VALUES (
                    LPAD(v_thang_check::TEXT, 2, '0'),
                    v_nam_check::TEXT
                );
                IF v_thang_check = 1 THEN
                    v_thang_check := 12;
                    v_nam_check := v_nam_check - 1;
                ELSE
                    v_thang_check := v_thang_check - 1;
                END IF;
            END LOOP;

            CREATE TEMP TABLE tmp_chidinh ON COMMIT DROP AS
            SELECT DISTINCT ON (cd.macls) cd.macls, cd.ngaykcb::DATE AS ngaykcb
            FROM current.chidinhcls cd
            WHERE cd.xoa = 0
                AND cd.ngaykcb IS NOT NULL
                AND (cd.thangkt, cd.namkt) IN (SELECT thangkt, namkt FROM tmp_thang_nam)
                AND cd.macls IN (SELECT macls FROM tmp_cls_songay)
                AND (
                    (v_filter_mathe IS NOT NULL AND cd.mathe = v_filter_mathe)
                    OR
                    (v_filter_mathe IS NULL AND cd.mabn = ANY(v_mabn_list))
                )
            ORDER BY cd.macls, cd.ngaykcb DESC;

            SELECT t.macls, t.tencls, t.songay, t.from_date, cd.ngaykcb
            INTO v_vi_pham
            FROM tmp_cls_songay t
            JOIN tmp_chidinh cd 
                ON cd.macls = t.macls
            WHERE t.from_date - cd.ngaykcb::DATE < t.songay
            ORDER BY t.macls, cd.ngaykcb DESC
            LIMIT 1;

            IF FOUND THEN
                RETURN jsonb_build_object(
                    'status', 'error',
                    'message', format('CLS %s:[%s] có ngày chỉ định gần nhất là %s vi phạm quy định số ngày chỉ định liên tiếp là %s ngày. Không thể thêm mới.',
                        v_vi_pham.macls, v_vi_pham.tencls, v_vi_pham.ngaykcb, v_vi_pham.songay),
                    'MedSerCode', v_vi_pham.macls
                );
            END IF;
        END IF;
    END IF;
        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)
            JOIN current.chidinhcls cd
                 ON cd.macls = (j.item->>'MedSerCode')
                AND cd.mabn = v_patientcode
                AND cd.makb = v_admissioncode
                AND cd.maba = v_medicalrecordno
                AND cd.xoa = 0
                AND cd.namkt||cd.thangkt >= r_bnnoitru.namkt||r_bnnoitru.thangkt
            JOIN current.dmcls dm ON dm.macls = cd.macls
            WHERE COALESCE(dm.thuchien,0) = 1
              AND COALESCE(cd.dath,0) = 0 AND COALESCE(cd.dalappttt,0)=0
              AND cd.ngaykcb <> (j.item->>'FromDate')::TIMESTAMP
        ) THEN
            RETURN jsonb_build_object(
                'status','error',
                'message','Có CLS cấu hình thực hiện đã được chỉ định nhưng chưa thực hiện, không thể thêm mới',
                'MedSerCode', COALESCE((
                    SELECT jsonb_agg(DISTINCT cd.macls)
                    FROM jsonb_array_elements(p_json->'ParaClinRequests') AS j(item)
                    JOIN current.chidinhcls cd 
                         ON cd.macls = (j.item->>'MedSerCode')
                        AND cd.mabn = v_patientcode
                        AND cd.makb = v_admissioncode
                        AND cd.maba = v_medicalrecordno
                        AND cd.xoa = 0
                        AND cd.namkt||cd.thangkt >= r_bnnoitru.namkt||r_bnnoitru.thangkt
                    JOIN current.dmcls dm ON dm.macls = cd.macls
                    WHERE dm.thuchien = 1
                      AND COALESCE(cd.dath,0) = 0 AND COALESCE(cd.dalappttt,0)=0
                      AND cd.ngaykcb <> (j.item->>'FromDate')::TIMESTAMP
                ), '[]'::jsonb)
            );
        END IF;
    
    SELECT COALESCE(giatri, '0') INTO sys_laygiadan
    FROM current.system WHERE tents = 'laygiadan';
    
    SELECT COALESCE(giatri, '0') INTO sys_laygiadv
    FROM current.system WHERE tents = 'laygiadv';
    
    CREATE TEMP TABLE ClsData ON COMMIT DROP AS
      SELECT *
      FROM current.chidinhcls cls
      WHERE cls.idchidinh = v_paraclinreqcode
        AND cls.xoa = 0
        AND cls.mabn = v_patientcode
        AND cls.makb = v_admissioncode
        AND cls.maba = v_medicalrecordno
        AND cls.thangkt = r_qtdieutri.thangkt
        AND cls.namkt = r_qtdieutri.namkt
        AND (
          cls.dathu != 0 
          OR COALESCE(cls.soctvpcl, '') != ''  
          OR COALESCE(cls.soctvpbltong, '') != ''
          OR cls.dath != 0  
          OR cls.dalappttt != 0
        );
    

    CREATE TEMP TABLE tmp_grouped_requests ON COMMIT DROP AS
    SELECT
        item->>'MedSerCode' AS medser_code,
        SUM(COALESCE((item->>'ParaClinQty')::NUMERIC, 1)) AS para_qty,
        COALESCE((item->>'IsHI')::BOOLEAN::INT, NULL) AS bhyt,
        COALESCE((item->>'Urgent')::INT, NULL) AS tinhtrang,	--Bổ sung cột tình trạng : 0 : Cấp cứu-Khẩn cấp; 1 : bình thường
        COALESCE((item->>'thuphi')::NUMERIC, 0) AS thuphi,
        COALESCE((item->>'IsService')::BOOLEAN::INT, 0) AS dichvu, --[Nguyễn Khắc Duy: 2026-04-01] thay đổi 'dichvu' sang 'IsService' theo thống nhất với EMR
        COALESCE((item->>'miengiam')::NUMERIC, 0) AS miengiam,
        COALESCE((item->>'ptmiengiam')::NUMERIC, 0) AS ptmiengiam_input,
        COALESCE((item->>'thanhtienmiengiam')::NUMERIC, 0) AS thanhtienmg,
		COALESCE((item->>'PCReqDtlNotes')::TEXT, '') AS tenclsphu, --[NTV 2026-01-07: lấy thêm cột tenclsphu (PCReqDtlNotes)]
        date_trunc(
            'second',
            CASE 
                WHEN ((item->>'FromDate')::TIMESTAMP)::TIME = '00:00:00'::TIME
                THEN (item->>'FromDate')::DATE + date_trunc('second', LOCALTIMESTAMP)::TIME
                ELSE (item->>'FromDate')::TIMESTAMP
            END
        ) AS ngaykcb,
        FALSE AS is_child
    FROM jsonb_array_elements(p_json->'ParaClinRequests') AS item
    GROUP BY item->>'MedSerCode', item->>'thuphi', item->>'IsService', item->>'miengiam', item->>'ptmiengiam', 
                item->>'thanhtienmiengiam',item->>'FromDate',item->>'IsHI',item->>'Urgent',item->>'PCReqDtlNotes';

    INSERT INTO tmp_grouped_requests (
        medser_code, para_qty, bhyt, tinhtrang, thuphi, dichvu, miengiam, ptmiengiam_input, thanhtienmg, ngaykcb, is_child
    )
    SELECT
        clscon.macls,
        grp.para_qty, COALESCE(grp.bhyt,0) AS bhyt, grp.tinhtrang, CASE WHEN COALESCE(grp.bhyt,0) = 1 THEN 0 ELSE 1 END AS thuphi,
        0, 0, 0, 0, grp.ngaykcb,
        TRUE
    FROM tmp_grouped_requests grp
    JOIN current.dmcls clscon ON clscon.macha = grp.medser_code
    WHERE COALESCE(clscon.sudung,0) = 1 
    	AND (COALESCE(clscon.gioitinh,0) = r_bnnoitru.gioitinh OR COALESCE(clscon.gioitinh,0) = 2)
    	AND clscon.macls NOT IN (
        SELECT medser_code FROM tmp_grouped_requests
    );
    IF EXISTS (
        SELECT 1
        FROM ClsData c
        WHERE NOT EXISTS (
            SELECT 1
            FROM tmp_grouped_requests t
            WHERE t.medser_code = c.macls
        )
    ) THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Cận lâm sàng đã thực hiện hoặc đã thu tiền, không thể xoá',
            'MedSerCode',
                COALESCE((
                    SELECT jsonb_agg(c.macls)
                    FROM ClsData c
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM tmp_grouped_requests t
                        WHERE TRIM(t.medser_code) = TRIM(c.macls)
                    )
                ), '[]'::jsonb)
        );
    END IF;
    
    IF EXISTS (
        SELECT 1
        FROM ClsData c
        JOIN tmp_grouped_requests t ON t.medser_code = c.macls
        WHERE (
            COALESCE(t.para_qty, 0) != COALESCE(c.soluong, 0)
            OR COALESCE(t.bhyt, 0) != COALESCE(c.bhyt, 0)
            OR COALESCE(t.thuphi, 0) != COALESCE(c.thuphi, 0)
            OR COALESCE(t.dichvu, 0) != COALESCE(c.dichvu, 0)
            OR COALESCE(t.miengiam, 0) != COALESCE(c.miengiam, 0)
            OR COALESCE(t.ptmiengiam_input, 0) != COALESCE(c.ptmiengiam, 0)            
        )
        AND (
            c.dathu != 0 OR 
            COALESCE(c.soctvpcl, '') != '' OR 
            c.dath != 0 OR 
            c.dalappttt != 0
        )
    ) THEN
        RETURN jsonb_build_object(
        'status', 'error',
        'message', 'Cận lâm sàng đã thực hiện hoặc đã thu tiền, không thể cập nhật',
        'MedSerCode', COALESCE((
            SELECT jsonb_agg(c.macls)
            FROM ClsData c
            JOIN tmp_grouped_requests t ON t.medser_code = c.macls
            WHERE (
                COALESCE(t.para_qty, 0) != COALESCE(c.soluong, 0)
                OR COALESCE(t.bhyt, 0) != COALESCE(c.bhyt, 0)
                OR COALESCE(t.thuphi, 0) != COALESCE(c.thuphi, 0)
                OR COALESCE(t.dichvu, 0) != COALESCE(c.dichvu, 0)
                OR COALESCE(t.miengiam, 0) != COALESCE(c.miengiam, 0)
                OR COALESCE(t.ptmiengiam_input, 0) != COALESCE(c.ptmiengiam, 0)
            )
            AND (
                c.dathu != 0 OR 
                COALESCE(c.soctvpcl, '') != '' OR 
                c.dath != 0 OR 
                c.dalappttt != 0
                )
            ),'[]'::jsonb)
        );
    END IF;
    
    UPDATE current.chidinhcls cls
          SET xoa = 1,
              ngayxoa = r_qtdieutri.ngaygio
          WHERE cls.idchidinh = v_paraclinreqcode
            AND cls.mabn = v_patientcode
            AND cls.makb = v_admissioncode
            AND cls.maba = v_medicalrecordno
            AND cls.xoa = 0
            AND cls.thangkt = r_qtdieutri.thangkt
            AND cls.namkt = r_qtdieutri.namkt
            AND NOT EXISTS (
                SELECT 1
                FROM tmp_grouped_requests req
                WHERE TRIM(req.medser_code) = TRIM(cls.macls)
            );
            
    CREATE TEMP TABLE tmp_data_ready ON COMMIT DROP AS
	SELECT
      req.medser_code,
      req.para_qty,
      COALESCE(req.bhyt,0) AS bhyt,
      req.tinhtrang AS tinhtrang,
      CASE WHEN COALESCE(req.bhyt,0) = 1 THEN 0 ELSE 1 END AS thuphi,
      req.dichvu,
      req.miengiam,
      req.ptmiengiam_input,
      req.thanhtienmg,      
      req.ngaykcb,
      req.is_child,
	  req.tenclsphu, --[NTV 2026-01-07: lấy thêm cột tenclsphu (PCReqDtlNotes)]
      CASE 
            WHEN r_bnnoitru.bhyt IN ('1','2') THEN
                (CASE
                    WHEN req.thuphi = 1 THEN cat.giadan07
                    WHEN req.dichvu = 1 THEN cat.giadv07
                    ELSE CASE WHEN sys_laygiadan::NUMERIC = 1 THEN cat.giadan07 ELSE cat.giabh07 END
                END)
            ELSE 
                (CASE WHEN sys_laygiadv::NUMERIC = 0 THEN cat.giadan07 ELSE cat.giadv07 END)
      END AS dongia,
      cat.giabh07 AS giabh,
      CASE 
            WHEN r_bnnoitru.bhyt IN ('1','2') THEN
                (CASE
                    WHEN req.dichvu = 1 AND cat.giadv07 > cat.giabh07 THEN cat.giadv07 - cat.giabh07
                    WHEN sys_laygiadan = '1' AND cat.giadan07 > cat.giabh07 THEN cat.giadan07 - cat.giabh07
                    ELSE 0
                END)
            ELSE 0
      END AS chenhlech,
      CASE
          WHEN req.miengiam = 1 AND req.thanhtienmg > 0 THEN
              ROUND(req.thanhtienmg / NULLIF(
                  CASE
                      WHEN r_bnnoitru.bhyt IN ('1','2') THEN
                          CASE
                              WHEN req.thuphi = 1 THEN cat.giadan07
                              WHEN req.dichvu = 1 THEN cat.giadv07
                              ELSE CASE WHEN sys_laygiadan = '1' THEN cat.giadan07 ELSE cat.giabh07 END
                          END
                      ELSE cat.giabh07
                  END, 0
              ) * 100, 2)
          ELSE 0
      END AS ptmiengiam,
      (
          COALESCE(
              CASE
                  WHEN r_bnnoitru.bhyt IN ('1','2') THEN
                      CASE
                          WHEN req.thuphi = 1 THEN cat.giadan07
                          WHEN req.dichvu = 1 THEN cat.giadv07
                          ELSE (CASE WHEN sys_laygiadan::NUMERIC = 1 THEN cat.giadan07 ELSE cat.giabh07 END)
                      END
                  ELSE (CASE WHEN sys_laygiadv::NUMERIC = 0 THEN cat.giadan07 ELSE cat.giadv07 END)
              END, 0
          ) * req.para_qty
      ) AS thanhtien,
      cat.ktcao, cat.ldanh, cat.tyle_tt, cat.giabhdm, cat.nguonkhac, cat.chiphint,
      CASE WHEN COALESCE(r_bnnoitru.ttcon,'') != '' THEN 2 ELSE 0 END AS toacon,
      COALESCE(r_bnnoitru.ttcon,'') AS macon, 
      CASE WHEN COALESCE(r_bnnoitru.ttcon,'') != '' THEN COALESCE(r_bnnoitru.mathe2,'') ELSE COALESCE(r_bnnoitru.mathe,'') END AS mathe
FROM tmp_grouped_requests req
JOIN (
    SELECT macls, giabh07, giadv07, giadan07, tyle_tt, nguonkhac,
           ktcao, ldanh, giabh07 AS giabhdm, bhyt, COALESCE(chiphint,0) AS chiphint
    FROM current.dmcls
) cat ON cat.macls = req.medser_code;

    UPDATE current.chidinhcls cls
    SET soluong = d.para_qty,
        thuphi = d.thuphi,
        dongia = d.dongia,
        giabh = d.giabh,
        chenhlech = d.chenhlech,
        dichvu = d.dichvu,
        miengiam = d.miengiam,
        ptmiengiam = d.ptmiengiam,
        thanhtien = d.thanhtien,
        thanhtienmg = d.thanhtienmg,
        ngaycd = LOCALTIMESTAMP,
        ngaykcb = d.ngaykcb,
        taikhoan = r_qtdieutri.taikhoan,
        maphong = r_qtdieutri.maphong,
        ktcao = d.ktcao,
        ldanh = d.ldanh,
        tile = d.tyle_tt,
        bhyt = d.bhyt,
        tinhtrang = COALESCE((CASE WHEN d.tinhtrang ISNULL 
        THEN (CASE WHEN r_bnnoitru.tinhtrangvv::NUMERIC = 0 THEN 1 ELSE 0 END)
        ELSE d.tinhtrang END),0),
        toacon = COALESCE(d.toacon,0),
        macon = COALESCE(d.macon,''),
        mathe = COALESCE(d.mathe,''),
		tenclsphu = COALESCE(d.tenclsphu,'')
    FROM tmp_data_ready d
	WHERE cls.idchidinh = v_paraclinreqcode
  	AND cls.macls = d.medser_code
    AND cls.mabn = v_patientcode
    AND cls.makb = v_admissioncode
    AND cls.maba = v_medicalrecordno
    AND cls.thangkt = r_qtdieutri.thangkt
    AND cls.namkt = r_qtdieutri.namkt
  	AND cls.xoa = 0;

    INSERT INTO current.chidinhcls (
        mabn, maba, makb, noitru, madt, madv, madv_dichvu, maphong,
        ngaykcb, manv, macls, soluong, thuphi, dongia, giabh, chenhlech,
        dichvu, miengiam, ptmiengiam, thanhtien, dath, dain, dathu, taikhoan,
        tenmay, xoa, thangkt, namkt, maicd, kqcdoan, mathe, thanhtienmg,
        iddienbien, tinhtrang, ngaycd, travedieutri, buong, sogiuong,
        toacon, macon, dongiausd, thanhtienusd, tygia, bhyt, ktcao, ldanh,
        pttraituyen, idchidinh, chiphint, tenclsphu, tile, giabhdm, maicdp,
        kqcdoanp, sophong, stt_led, dinhsuat, sdnguonkhac, ngaykq,
        mayhct, tenyhct, api
    )
    SELECT
        v_patientcode,                             -- mabn
        v_medicalrecordno,                         -- maba
        v_admissioncode,                           -- makb
        1,                                         -- noitru
        r_bnnoitru.madt,                           -- madt
        r_bnnoitru.madv,                           -- madv
        NULL,                                      -- madv_dichvu
        r_qtdieutri.maphong,                       -- maphong
        d.ngaykcb,                       		   -- ngaykcb
        r_qtdieutri.manv,                          -- manv
        d.medser_code,                             -- macls
        d.para_qty,                                -- soluong
        d.thuphi,                                  -- thuphi
        d.dongia,                                  -- dongia
        d.giabh,                                   -- giabh
        d.chenhlech,                               -- chenhlech
        d.dichvu,                                  -- dichvu
        d.miengiam,                                -- miengiam
        d.ptmiengiam,                              -- ptmiengiam
        d.thanhtien,                               -- thanhtien
        0,                                         -- dath
        0,                                         -- dain
        0,                                         -- dathu
        r_qtdieutri.taikhoan,                      -- taikhoan
        'EMR.DHS',                                 -- tenmay
        0,                                         -- xoa
        r_qtdieutri.thangkt,                       -- thangkt
        r_qtdieutri.namkt,                         -- namkt
        r_qtdieutri.maicd,                         -- maicd
        r_qtdieutri.kqcdoan,                       -- kqcdoan
        d.mathe,		                           -- mathe
        d.thanhtienmg,                             -- thanhtienmg
        v_tpcode,                                  -- iddienbien
        CASE WHEN d.tinhtrang ISNULL 
        THEN (CASE WHEN r_bnnoitru.tinhtrangvv::NUMERIC = 0 THEN 1 ELSE 0 END)
        ELSE d.tinhtrang END,           			   -- tinhtrang
        LOCALTIMESTAMP,                       	   -- ngaycd
        0,                                         -- travedieutri
        r_qtdieutri.maphong,                       -- buong
        r_qtdieutri.sogiuong,                      -- sogiuong
        d.toacon,                                  -- toacon
        d.macon,                                   -- macon
        0,                                         -- dongiausd
        0,                                         -- thanhtienusd
        0,                                         -- tygia
        d.bhyt,                                    -- bhyt
        d.ktcao,                                   -- ktcao
        d.ldanh,                                   -- ldanh
        d.tyle_tt,                                 -- pttraituyen
        v_paraclinreqcode,                         -- idchidinh
        d.chiphint,                                -- chiphint
        d.tenclsphu,                               -- tenclsphu [NTV 2026-01-07: thêm tenclsphu]
        d.tyle_tt,                                 -- tile
        d.giabhdm,                                 -- giabhdm
        r_qtdieutri.maicdp,                        -- maicdp
        r_qtdieutri.kqcdoanp,                      -- kqcdoanp
        NULL,                                      -- sophong
        NULL,                                      -- stt_led
        0,                                         -- dinhsuat
        d.nguonkhac,                               -- sdnguonkhac
        NULL,                                      -- ngaykq        
        r_qtdieutri.mayhct,                        -- mayhct
        r_qtdieutri.tenyhct,                       -- tenyhct
        1                                          -- api
    FROM tmp_data_ready d
    WHERE NOT EXISTS (
    SELECT 1 FROM current.chidinhcls cls
    WHERE cls.idchidinh = v_paraclinreqcode
      AND cls.macls = d.medser_code
      AND cls.mabn = v_patientcode
      AND cls.makb = v_admissioncode
      AND cls.maba = v_medicalrecordno
      AND cls.thangkt = r_qtdieutri.thangkt
      AND cls.namkt = r_qtdieutri.namkt
      AND cls.xoa = 0);

    RETURN jsonb_build_object('status', 'success', 'message', 'Ok');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

`
  },
  "badt_dhs.InsertDiagnose": {
    name: "badt_dhs.InsertDiagnose",
    para: ["p_json"],
    returns: "JSONB",
    codesql: `


CREATE OR REPLACE FUNCTION badt_dhs.InsertDiagnose(p_json JSONB)
RETURNS JSONB AS
$$
DECLARE
-- Lastest commit: author:nkduy1512; date: 2026-05-19 15:47:26
-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.badt_dhs.InsertDiagnose(p_json JSONB)
-- Mô tả: Nhận dữ liệu Json thêm vào dữ liệu
-- Bổ sung so với file mẫu:
--   "NGAYTH"
--   "MAKB"
--   "MABA"
--   "MA_BSDOC"
--   "MABSDT"
--   "MAKP"
--   "MAPHONG"
-- Chưa rõ thông tin :
--   "NGAY_CD" và "NGAYCD" => Chưa rõ ngày chỉ định hay ngày chẩn đoán
-- ===============================================================
-- Lấy dữ liệu từ JSON
-- Tham số hệ thống
--Kiểm tra nhân viên trả kết quả
-- Kiểm tra mã máy thực hiện
--[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
--[ÔNG TRIỆU HẬU: 2025-09-25] Kiểm tra trạng thái ra viện, không kiểm tra nếu ngoại trú
-- Kiểm tra tồn tại trong chidinhcls
--[ÔNG TRIỆU HẬU: 2025-11-10]: Lấy thêm các thông tin để xử lý toàn bộ điều kiện WHERE phía sau.
--[ÔNG TRIỆU HẬU: 2025-10-14]:
--  https://storage.googleapis.com/accurately-sharp-katydid.appspot.com/ShareX/2025/10/DESKTOP-2FLMTI6-Zalo-2025-10-14-18h22p37.976.png
--  https://storage.googleapis.com/accurately-sharp-katydid.appspot.com/ShareX/2025/10/DESKTOP-2FLMTI6-explorer-2025-10-14-19h40p20.874.png
-- Xử lý theo qui tắc EMR: chỉ định từ EMR => HIS (Kết quả sẽ gửi theo: PCReqDltVoucherNo: ParaClinReqCode  + MedSerCode)
--  [Chỉ định tại HIS => EMR] theo : ParaClinReqCode,
--  Đây là thông tin chỉ định tại HIS => EMR: CASE WHEN chidinhcls_noitru=0 AND maba_by_row= THEN NEW.makb||.||NEW.madv||.||NEW.maphong ELSE NEW.iddienbien END,
-- Xử lý theo hướng, tìm trong chidinhcls, để lấy ngaykcb, xử lý toàn bộ phía sau.
--[ÔNG TRIỆU HẬU: 2025-11-07]: Xử lý lại để gọn điều kiện, sử dụng CASE WHEN đối với v_huyketqua
--[Xử lý thêm để nhận và hủy kết quả khi đã chuyển CLS vào nội trú dưới HIS. https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/71]
--[ÔNG TRIỆU HẬU: 2025-10-02]: Nếu có row trong chidinhcls thì cập nhật lại v_ngaycd = chidinhcls.ngaykcb
--                             Để đảm bảo các logic phía sau không ảnh hưởng
-- Kiểm tra khoảng thời gian thực hiện y lệnh
-- Kiểm tra khoảng thời gian trả kết quả
--Yêu cầu: Thêm ràng buộc thời gian trong xử lý nhận kết quả chẩn đoán hình ảnh từ EMR về HIS
--https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/110
--[NQHOA 2026-01-28] Bổ sung kiểm tra
--Diagnose: Hỗ trợ trừ kho phim XQ khi nhận kết quả từ EMR
--https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/108
--[NQHOA 2026-01-30] Kiểm tra và trừ kho phim Xquang      
-- Huỷ kết quả
--[ÔNG TRIỆU HẬU: 2025-11-10: 11:03] Bỏ điều kiện này, vì không phù hợp đối với CLS chuyển vào nội trú.
--AND COALESCE(maba,'') = v_chidinhcls.maba
--Diagnose: Hỗ trợ trừ kho phim XQ khi nhận kết quả từ EMR
--https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/108
--[NQHOA 2026-01-30] Phục hồi phim Xquang theo tham số ha.phuchoiphim
--[ÔNG TRIỆU HẬU: 2025-10-14]: Đổi lại điều kiện ngaykcb, lấy theo v_chidinhcls.ngaykcb,
--                đã kiểm tra có tồn tại trong chidinhcls ở bước kiểm tra
-- lấy MOTA_IMAGE{i} không phân biệt hoa thường
    v_iddienbien TEXT := p_json->>'TPCode';
    v_voucherno  TEXT := p_json->>'PCReqDltVoucherNo';
    v_mabn       TEXT := p_json->>'PatientCode';
    v_makb       TEXT := p_json->>'AdmissionCode';
    v_maba       TEXT := p_json->>'MedicalRecordNo';
    v_macls      TEXT := p_json->>'MedSerCode';
    v_ngaycd     TIMESTAMP := (p_json->>'NgayChiDinh')::TIMESTAMP;
    v_ngayth     TIMESTAMP := (p_json->>'NgayThucHien')::TIMESTAMP;
    v_ngaykq     TIMESTAMP := (p_json->>'NgayKetQua')::TIMESTAMP;
    v_madv		 TEXT 	   := p_json->>'MaDonViThucHien';
    v_phong		 TEXT 	   := p_json->>'MaPhongThucHien';

    v_manv_thuchien TEXT := p_json->>'MaNhanVienThucHien';
    v_manv_ketqua   TEXT := p_json->>'MaNhanVienTraKQ';
    v_mamay         TEXT := p_json->>'MaMayThucHien';

    v_ketluan       TEXT := p_json->>'KetLuan';
    v_mota       	TEXT := p_json->>'MoTa';
    v_ghicchu      	TEXT := p_json->>'GhiChu';
    v_huyketqua BOOLEAN := (p_json->>'IsHuyKetQua')::BOOLEAN;
    v_filepath TEXT := (
                        SELECT value
                        FROM jsonb_each_text(p_json)
                        WHERE upper(key) = 'FILEPATH'
                        );

    v_chidinhcls RECORD;
    v_psdangky RECORD;

    v_exists_nv_thuchien INT;
    v_exists_nv_ketqua   INT;
    v_exists_mamay       INT;
    v_exists_pskhamha	 INT;

    v_sophuttoithieu   INT;
    v_sophuttraketqua  INT;


    cchn_thuchien 	TEXT;
    tk_thuchien 	TEXT;
    tk_traketqua 	TEXT;

    v_checktgthuchien NUMERIC;
    v_checktgketqua NUMERIC;


    cd_thangkt		TEXT;
    cd_namkt		TEXT;
    v_ngaycd_lui1thang TIMESTAMP := v_ngaycd - INTERVAL '1 month';
    v_ngaykq_lui1thang TIMESTAMP := v_ngaykq - INTERVAL '1 month';

    v_pstonkhoxq RECORD;
    v_pshdxncls RECORD;
    v_khophimxq NUMERIC;
    v_phuchoiphimxq NUMERIC;
    v_sohd  INT;

BEGIN
    IF v_huyketqua = FALSE THEN
      SELECT COUNT(*) INTO v_exists_nv_thuchien
      FROM current.dmnhanvien
      WHERE manv = v_manv_thuchien
        AND COALESCE(macc_hanhnghe_cv2348,'') != ''
        AND COALESCE(trangthai,'0') = '1';

      IF v_exists_nv_thuchien = 0 THEN
          RETURN jsonb_build_object(
              'success', false,
              'message', format(
                  'Nhân viên %s không có chứng chỉ hành nghề hoặc đã nghỉ việc',
                  v_manv_thuchien
              )
          );
      END IF;

      SELECT COUNT(*) INTO v_exists_nv_ketqua
      FROM current.dmnhanvien
      WHERE manv = v_manv_ketqua
        AND COALESCE(macc_hanhnghe_cv2348,'') != ''
        AND COALESCE(trangthai,'0') = '1';

      IF v_exists_nv_ketqua = 0 THEN
          RETURN jsonb_build_object(
              'success', false,
              'message', format(
                  'Nhân viên %s không có chứng chỉ hành nghề hoặc đã nghỉ việc',
                  v_manv_ketqua
              )
          );
      END IF;
      SELECT COUNT(*) INTO v_exists_mamay
      FROM current.dmmamay
      WHERE mamay = v_mamay;

      IF v_exists_mamay = 0 THEN
          RETURN jsonb_build_object(
              'status', 'error',
              'message', format(
                  'Không tìm thấy mã máy thực hiện: %s',
                  v_mamay
              )
          );
      END IF;
    END IF;

    IF COALESCE(v_maba,'')<>'' THEN
        IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
                        WHERE mabn = v_mabn AND makb = v_makb AND maba = v_maba AND COALESCE(ravien,0) = 0
        ) THEN
            RETURN jsonb_build_object('status', 'error', 'message',
                format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)',
                v_mabn, v_makb, v_maba)
            );
        END IF;
    END IF;

    SELECT  cd.ngaykcb, cd.thangkt, cd.namkt,
            COALESCE(cd.dath,0) AS dath,
            COALESCE(cd.dathu,0) AS dathu,
            COALESCE(cd.dalappttt,0) AS dalappttt,
            cd.mabn, cd.makb,COALESCE(cd.maba,'') AS maba,
            cd.macls, dm.maloai, COALESCE(p.maphim,'') AS phimmacdinh,
            COALESCE(p.lanchup,0) AS phim_lanchup, COALESCE(p.soluong,0) AS phim_soluong, cd.madt, cd.noitru
    INTO v_chidinhcls
    FROM current.chidinhcls cd
    LEFT JOIN current.dmcls dm ON dm.macls = cd.macls
    LEFT JOIN current.phimmacdinh p ON p.macls = cd.macls
    WHERE cd.xoa = 0
      AND cd.macls = v_macls
      AND COALESCE(cd.iddienbien,'') = COALESCE(v_iddienbien,'')
      AND (cd.namkt||cd.thangkt) >= to_char(v_ngaykq_lui1thang,'YYYYMM')
      AND (
            ( -- Chỉ định từ EMR
              COALESCE(cd.api,0) = 1
              AND COALESCE(cd.noitru,0) = 1
              AND cd.idchidinh||cd.macls = v_voucherno
              AND COALESCE(cd.dath,0) = CASE WHEN v_huyketqua = TRUE THEN 1 ELSE 0 END
            )
            OR -- Chỉ định từ HIS - Nội trú
            (
              COALESCE(cd.api,0) = 0
              AND COALESCE(cd.noitru,0) = 1
              AND (cd.iddienbien||cd.macls = v_voucherno OR
                   (cd.makb||'.'||cd.madv||'.'||cd.maphong)||cd.macls = v_voucherno
                )
              AND COALESCE(cd.dath,0) = CASE WHEN v_huyketqua = TRUE THEN 1 ELSE 0 END
            )
            OR -- Chỉ định từ HIS - Ngoại trú
            (
              COALESCE(cd.api,0) = 0
              AND COALESCE(cd.noitru,0) = 0
              AND (cd.makb||'.'||cd.madv||'.'||cd.maphong)||cd.macls = v_voucherno
              AND COALESCE(cd.dath,0) = CASE WHEN v_huyketqua = TRUE THEN 1 ELSE 0 END
            )
        )
    ORDER BY ngaykcb ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format(
                'Không tìm thấy chỉ định với macls=%s, iddienbien=%s, PCReqDltVoucherNo=%s, ngaykcb=%s',
                v_macls, v_iddienbien, v_voucherno, v_ngaycd
            )
        );
    END IF;

    v_ngaycd := v_chidinhcls.ngaykcb;
    
    SELECT CAST(giatri AS INT)
      INTO v_khophimxq
      FROM current.system
      WHERE tents = 'ha.khophimxq';
      
    SELECT CAST(giatri AS INT)
      INTO v_phuchoiphimxq
      FROM current.system
      WHERE tents = 'ha.phuchoiphim';


	IF v_huyketqua = FALSE THEN --Nếu không huỷ kết quả mới kiểm tra
      SELECT CAST(giatri AS INT) INTO v_sophuttoithieu
      FROM current.system
      WHERE tents = 'ha.sophuttoithieu';

      SELECT CAST(giatri AS INT) INTO v_sophuttraketqua
      FROM current.system
      WHERE tents = 'ha.sophuttraketqua';

      v_checktgthuchien := EXTRACT(EPOCH FROM (v_ngayth - v_ngaycd)) / 60.0;
      IF v_checktgthuchien <= v_sophuttoithieu THEN
          RETURN jsonb_build_object(
              'status', 'error',
              'message', format(
                  'Thời gian thực hiện y lệnh phải tối thiểu %s phút đối với thời gian chỉ định',
                  v_sophuttoithieu
              )
          );
      END IF;

      v_checktgketqua := EXTRACT(EPOCH FROM (v_ngaykq - v_ngayth)) / 60.0;
      IF v_checktgketqua <= v_sophuttraketqua THEN
          RETURN jsonb_build_object(
              'status', 'error',
              'message', format(
                  'Thời gian trả kết quả phải tối thiểu %s phút kể từ thời gian thực hiện',
                  v_sophuttraketqua
              )
          );
      END IF;
      SELECT maba, bant, dain, ngayinphieu
      INTO v_psdangky
      FROM current.psdangky
      WHERE thangkt = v_chidinhcls.thangkt AND namkt = v_chidinhcls.namkt
      AND xoa = 0
      AND mabn = v_mabn
      AND makb = v_makb;

      IF COALESCE(v_maba,'') = '' OR (COALESCE(v_maba,'') LIKE 'N%' AND COALESCE(v_psdangky.bant,0) = 1) THEN
        IF COALESCE(v_psdangky.ngayinphieu,'01/01/1001 00:00:00') != '01/01/1001 00:00:00' THEN
                IF v_ngaykq >= v_psdangky.ngayinphieu::TIMESTAMP THEN
                  RETURN jsonb_build_object(
                'status', 'error',
                'message', format(
                    'Thời gian trả kết quả phải nhỏ hơn thời gian kết thúc đợt điều trị %s ',
                    to_char(v_psdangky.ngayinphieu,'DD/MM/YYYY HH24:MI:SS')
                    ));
              END IF;
        END IF;
      END IF;


      IF COALESCE(v_khophimxq,0) = 1 AND COALESCE(v_chidinhcls.maloai,'') IN ('XQ', 'XQKTS', 'MRI', 'CCT') AND COALESCE(v_chidinhcls.phimmacdinh,'') != '' THEN
        
      	SELECT mahh, dongia, handung, solo,
        tondau, nhap, xuat, toncuoi, thangkt, namkt
        INTO v_pstonkhoxq
        FROM CURRENT.pstonkhoxq
        WHERE mahh = v_chidinhcls.phimmacdinh
        AND thangkt = v_chidinhcls.thangkt
        AND namkt = v_chidinhcls.namkt
        AND COALESCE(toncuoi,0) >= v_chidinhcls.phim_soluong
        ORDER BY oid ASC LIMIT 1;

        IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format(
                'Phim %s không đủ tồn kho',
                v_chidinhcls.phimmacdinh
            )
        );
        END IF;

        SELECT max(substr(sohd, 7))::INT
        INTO v_sohd
        FROM current.pshdxncls
        WHERE loaixn = 'X' AND
               thangkt = v_chidinhcls.thangkt AND
               namkt = v_chidinhcls.namkt AND
               COALESCE(mabn, '') != '' AND
               xoa = 0;

        IF COALESCE(v_sohd,0) = 0 THEN
        	v_sohd = 1;
            ELSE v_sohd = v_sohd + 1;
        END IF;

        INSERT INTO current.pshdxncls(sohd, mabn, makb, maba, madt, noitru, ngaylap,
        loaixn, loaicls, mahh, gianhap, giaxuat, solo, handung, soluong, thanhtien,
        taikhoan, tenmay, thangkt, namkt)
         VALUES ( v_chidinhcls.namkt || v_chidinhcls.thangkt|| lpad(v_sohd::TEXT,4,'0')
         		 ,v_mabn , v_makb, v_macls , v_chidinhcls.madt
         		 ,v_chidinhcls.noitru , v_ngaykq, 'X', v_chidinhcls.maloai
           		 ,v_chidinhcls.phimmacdinh,v_pstonkhoxq.dongia,v_pstonkhoxq.dongia
                 ,v_pstonkhoxq.solo,v_pstonkhoxq.handung,v_chidinhcls.phim_soluong
                 ,v_pstonkhoxq.dongia*v_chidinhcls.phim_soluong ,'EMR'
           		 ,'EMR',v_chidinhcls.thangkt,v_chidinhcls.namkt );
         UPDATE current.pstonkhoxq
          SET xuat = xuat + v_chidinhcls.phim_soluong
          WHERE mahh = v_chidinhcls.phimmacdinh
          AND dongia = v_pstonkhoxq.dongia
          AND COALESCE(handung, '') = COALESCE(v_pstonkhoxq.handung,'')
          AND COALESCE(solo, '') = COALESCE(v_pstonkhoxq.solo,'')
          AND thangkt = v_chidinhcls.thangkt
          AND namkt = v_chidinhcls.namkt ;
      END IF;
    END IF;

      SELECT taikhoan, macc_hanhnghe_cv2348
      INTO tk_thuchien, cchn_thuchien
      FROM current.dmnhanvien
      WHERE manv = v_manv_thuchien;

      SELECT taikhoan
      INTO tk_traketqua
      FROM current.dmnhanvien
      WHERE manv = v_manv_ketqua;

    IF v_huyketqua = TRUE THEN
        DELETE FROM current.pskhamha
        WHERE
            mabn = v_chidinhcls.mabn
            AND makb = v_chidinhcls.makb
            AND macls = v_chidinhcls.macls
            AND ngaykcb = v_chidinhcls.ngaykcb;

        UPDATE current.chidinhcls
         SET dath = 0,
             giolaymau = NULL,
             ngaykq = NULL,
             nguoi_thuc_hien = ''
         WHERE mabn = v_chidinhcls.mabn
               AND makb = v_chidinhcls.makb
               AND COALESCE(maba,'') = v_chidinhcls.maba
               AND macls = v_chidinhcls.macls
               AND ngaykcb = v_chidinhcls.ngaykcb
               AND thangkt = v_chidinhcls.thangkt
               AND namkt = v_chidinhcls.namkt
               AND COALESCE(xoa, 0) = 0;
         IF COALESCE(v_khophimxq,0) = 1 AND COALESCE(v_phuchoiphimxq,0) = 1 AND COALESCE(v_chidinhcls.maloai,'') IN ('XQ', 'XQKTS', 'MRI', 'CCT') THEN
            SELECT sohd, ngaylap, mahh, giaxuat, solo, handung
                INTO v_pshdxncls
                FROM current.pshdxncls
              WHERE xoa = 0
                AND mabn = v_mabn
                AND makb = v_makb
                AND maba = v_macls
                AND ngaylap = v_ngaykq
                AND loaixn = 'X'
                AND thangkt = v_chidinhcls.thangkt
                AND namkt = v_chidinhcls.namkt;
            
        	UPDATE current.pshdxncls set xoa = 1, ngayxoa = LOCALTIMESTAMP
            WHERE xoa = 0              
              AND sohd = v_pshdxncls.sohd
              AND loaixn = 'X'              
              AND thangkt = v_chidinhcls.thangkt
              AND namkt = v_chidinhcls.namkt;
                        
            UPDATE current.pstonkhoxq SET xuat = xuat - v_chidinhcls.phim_soluong
            WHERE mahh = v_pshdxncls.mahh
              AND dongia = v_pshdxncls.giaxuat
              AND solo = v_pshdxncls.solo
              AND handung = v_pshdxncls.handung
              AND thangkt = v_chidinhcls.thangkt
              AND namkt = v_chidinhcls.namkt;
        END IF;
    ELSE --Nhận kết quả
        INSERT INTO current.pskhamha (
            mabn, makb, maba, macls, tenmay,
            taikhoan, manv, madv, maphong, ngaykcb,
            ngaycd, mamay,ketluan, ketluan_plaintext, mota_text, ghichu,
            dakhoa, mabl, thangkt, namkt, phienban,
            taikhoan_traketqua, hinhthuctraketqua, api, filepath, maphim, soluong, lanchup
        )
        VALUES (
            v_mabn, v_makb, v_maba, v_macls, 'EMR',
            tk_thuchien, v_manv_ketqua, v_madv, v_phong, v_ngaycd::TIMESTAMP,
            v_ngaykq::TIMESTAMP, v_mamay,v_ketluan, v_ketluan, v_mota, v_mota, 1, '',
            to_char(v_ngaykq::date,'MM'),to_char(v_ngaykq::date,'YYYY'), 'EMR.API',
            tk_traketqua,0, 1, v_filepath, v_chidinhcls.phimmacdinh, v_chidinhcls.phim_soluong, v_chidinhcls.phim_lanchup
        );

        UPDATE current.chidinhcls
        SET dath = 1,
            giolaymau = v_ngayth::TIMESTAMP,
            ngaykq = v_ngaykq::TIMESTAMP,
            nguoi_thuc_hien = cchn_thuchien
        WHERE mabn = v_chidinhcls.mabn
             AND makb = v_chidinhcls.makb
             AND COALESCE(maba,'') = v_chidinhcls.maba
             AND macls = v_chidinhcls.macls
             AND ngaykcb = v_chidinhcls.ngaykcb
             AND thangkt = v_chidinhcls.thangkt
             AND namkt = v_chidinhcls.namkt
             AND COALESCE(xoa, 0) = 0;       
    END IF;

    DELETE FROM current.pshinhanh
    WHERE mabn = v_chidinhcls.mabn
      AND makb = v_chidinhcls.makb
      AND macls = v_chidinhcls.macls
      AND ngaykcb = v_chidinhcls.ngaykcb;

    IF v_huyketqua = FALSE THEN --[NQHOA 2025-11-06]: Nếu không phải huỷ kết quả mới check và thêm dữ liệu vào bảng pshinhanh
        DECLARE
            i INT := 1;
            v_image_key TEXT;
            v_mota_key TEXT;
            v_image_val TEXT;
            v_mota_val TEXT;
            v_hinhanh TEXT;
            v_ngaycd_str TEXT := to_char(v_ngaycd, 'DDMMYYYY_HH24MISS');
        BEGIN
            LOOP
                v_image_key := format('IMAGE%s', i);
                v_mota_key  := format('MOTA_IMAGE%s', i);

                SELECT value INTO v_image_val
                FROM jsonb_each_text(p_json)
                WHERE upper(key) = v_image_key
                LIMIT 1;

                EXIT WHEN v_image_val IS NULL;

                IF v_image_val <> '' THEN
                    SELECT value INTO v_mota_val
                    FROM jsonb_each_text(p_json)
                    WHERE upper(key) = v_mota_key
                    LIMIT 1;

                    v_mota_val := COALESCE(v_mota_val, '');
                    v_hinhanh := format('%s_%s_%s_%s_%s.jpg',
                                        v_mabn, v_makb, v_macls,
                                        v_ngaycd_str, i);

                    INSERT INTO current.pshinhanh (
                        mabn, makb, maba, ngaykcb, macls, stt,
                        mota, hinhanh, thangkt, namkt, ngaycd, chon
                    )
                    VALUES (
                        v_mabn, v_makb, '', v_ngaycd, v_macls, i,
                        v_mota_val, v_hinhanh, v_chidinhcls.thangkt, v_chidinhcls.namkt,
                        v_ngaykq, 1
                    );
                END IF;

                i := i + 1;
            END LOOP;
        END;
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'OK'
    );

    EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Lỗi xử lý: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;










`
  },
  "badt_dhs.IsCancelCUTPParaClinRequest": {
    name: "badt_dhs.IsCancelCUTPParaClinRequest",
    para: ["input_json"],
    returns: "JSONB",
    codesql: `

/*
SELECT badt_dhs.IsCancelCUTPParaClinRequest('{
    "PresCode": "DH3.20250810.093546",
    "PatientCode": "2025019850",
    "AdmissionCode": "2506012221",
    "MedicalRecordNo": "2025007154",
    "ParaClinReqCode": "2025007154_20250810095736",
    "PCReqDltVoucherNo": "BE05"
}':: JSONB);
*/
CREATE OR REPLACE FUNCTION badt_dhs.IsCancelCUTPParaClinRequest(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
-- Lastest commit: author:Nguyễn Triều Vương; date: 2025-08-22 10:46:17
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-08-22
-- Hàm: badt_dhs.IsCancelCUTPParaClinRequest(input_json JSONB)
-- Mô tả: Hủy 1 thuốc trong toa
--   input_json: nội dung file json: thông tin bệnh nhân và toa thuốc
-- Sử dụng:
--   SELECT badt_dhs.IsCancelCUTPParaClinRequest(input_json JSONB);
--   Kiểm tra cls có đủ điều kiện xóa hay không
-- ===============================================================
-- Kiểm tra bn xuất viện
--Kiểm tra điệu kiện cận lâm sàng
-- Kiểm tra điều kiện lỗi chi tiết
--Kiểm trả CLS có kèm toa vật tư không?
-- Nếu không có lỗi
    p_mabn TEXT := input_json->>'PatientCode'; --Mã bệnh nhân
    p_maba TEXT := input_json->>'MedicalRecordNo'; -- Mã bệnh án
    p_makb TEXT := input_json->>'AdmissionCode'; -- Mã khám bệnh
    p_iddienbien TEXT := input_json->>'TPCode'; -- ID diễn biến
    p_idchidinh TEXT := input_json->>'ParaClinReqCode'; -- ID chỉ định
    p_macls TEXT := input_json->>'PCReqDltVoucherNo'; --Mã CLS

    v_exists BOOLEAN;
    v_ravien BOOLEAN;
    v_dain INT;
    v_dath INT;
    v_dathu INT;
    v_dalappttt INT;
    v_tongtien NUMERIC;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM current.bnnoitru
        WHERE mabn = p_mabn
          AND maba = p_maba
          AND makb = p_makb
          AND COALESCE(ravien, 0) > 0
    ) INTO v_ravien;

    IF  v_ravien THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Bệnh nhân %s đã xuất viện', p_maba)
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM current.chidinhcls
        WHERE mabn = p_mabn
          AND maba = p_maba
          AND makb = p_makb
          AND idchidinh = p_idchidinh
          AND COALESCE(xoa, 0) = 0
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('ID chỉ định %s không tồn tại', p_idchidinh)
        );
    END IF;

    SELECT COALESCE(dain,0), COALESCE(dath,0), COALESCE(dathu,0), COALESCE(dalappttt,0)
    INTO v_dain, v_dath, v_dathu, v_dalappttt
    FROM current.chidinhcls
    WHERE mabn = p_mabn
      AND maba = p_maba
      AND makb = p_makb
      AND idchidinh = p_idchidinh
      AND macls = p_macls
      AND COALESCE(xoa,0) = 0;

    IF v_dain != 0 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã in, không thể xóa', p_macls)
        );
    ELSIF v_dathu = 1 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã thu tiền, không thể xóa', p_macls)
        );
    ELSIF v_dath = 1 OR v_dalappttt > 0 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã thực hiện, không thể xóa', p_macls)
        );
    ELSIF v_dath = 2 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã lấy mẫu/lấy số, không thể xóa', p_macls)
        );
    ELSIF v_dath = 3 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đang thực hiện, không thể xóa', p_macls)
        );
    ELSIF v_dath >= 4 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s đã thực hiện, không thể xóa', p_macls)
        );
    END IF;

     SELECT COALESCE(sum(tien),0) as tien
     INTO v_tongtien
     FROM (
           SELECT COALESCE(idchidinh,'') as id,
            CASE when loaixn = 'xbb' then thanhtien
                 when (loaixn = 'tto' or loaixn = 'ttt') and COALESCE(dain,0)= 1 then - thanhtien
                 else 0 end as tien
           FROM current.chungtu
           WHERE idchidinh = p_idchidinh
              AND mabn = p_mabn
              AND makh = p_maba
              AND macls = p_macls
              AND COALESCE(xoa,0) = 0
        ) as tam;

    IF v_tongtien > 0 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Cận lâm sàng %s có vật tư hoặc thuốc kèm theo, không thể xóa', p_macls)
        );
    END IF;
    RETURN jsonb_build_object(
        'status', 'success',
        'message', format('Cận lâm sàng %s được phép xóa', p_macls)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
`
  },
  "badt_dhs.IsCancelTPPrescription": {
    name: "badt_dhs.IsCancelTPPrescription",
    para: ["input_json"],
    returns: "JSONB",
    codesql: `

/*
SELECT badt_dhs.IsCancelTPPrescription('{
    "PatientCode": "2025019850",
    "MedicalRecordNo": "2025007154",
    "AdmissionCode": "2506012221",
    "PresCode": "DH3.X25.0822.075624",
    "TPCode": "DH3.20250812.081748",
    "PresDtlCode": "A597"
}':: JSONB);
*/

CREATE OR REPLACE FUNCTION badt_dhs.IsCancelTPPrescription(input_json JSONB)
RETURNS JSONB AS
$$
DECLARE
-- Lastest commit: author:Nguyễn Triều Vương; date: 2025-08-22 10:44:58
-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-08-22
-- Hàm: badt_dhs.IsCancelTPPrescription(input_json JSONB)
-- Mô tả: Kiểm tra chứng từ xem có được phép xóa hay khong
--   input_json: nội dung file json: thông tin bệnh nhân và toa thuốc
-- Sử dụng:
--   SELECT badt_dhs.IsCancelTPPrescription(input_json JSONB);
-- Kiểm tra bn xuất viện
-- Lấy thông tin từ bảng chungtu
-- Kiểm tra điều kiện lỗi chi tiết
-- Nếu không có lỗi
    TPCode TEXT := input_json->>'TPCode';          -- mã tờ điều trị: iddienbien
    AdmissionCode TEXT := input_json->>'AdmissionCode'; -- makb
    MedicalRecordNo TEXT := input_json->>'MedicalRecordNo'; -- maba
    PatientCode TEXT := input_json->>'PatientCode';       -- mabn
    PresCode TEXT := input_json->>'PresCode';             -- sohd

    v_dain INT;
    v_dathu INT;
    v_ttchinhtoa INT;
    v_ravien BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM current.bnnoitru
        WHERE mabn = PatientCode
          AND maba = MedicalRecordNo
          AND makb = AdmissionCode
          AND COALESCE(ravien, 0) > 0
    ) INTO v_ravien;

    IF  v_ravien THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Bệnh nhân %s đã xuất viện, không thể xóa toa', MedicalRecordNo)
        );
    END IF;

    SELECT
        COALESCE(dain,0),
        COALESCE(dathu,0),
        COALESCE(ttchinhtoa,0)
    INTO v_dain, v_dathu, v_ttchinhtoa
    FROM current.chungtu
    WHERE mabn = PatientCode
      AND makh = MedicalRecordNo
      AND sohd = PresCode
      AND COALESCE(xoa,0) = 0
    LIMIT 1;

    IF v_dain != 0 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đã in, không thể xóa', PresCode)
        );
    ELSIF v_dathu = 1 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đã thu tiền, không thể xóa', PresCode)
        );
    ELSIF v_ttchinhtoa = 1 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đang chỉnh, không thể xóa', PresCode)
        );
    ELSIF v_ttchinhtoa = 4 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đang tổng hợp, không thể xóa', PresCode)
        );
    ELSIF v_ttchinhtoa = 5 THEN
        RETURN jsonb_build_object(
            'status', 'warning',
            'message', format('Số chứng từ %s đã tổng hợp, không thể xóa', PresCode)
        );
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', format('Số chứng từ %s được phép xóa', PresCode)
    );

END;
$$ LANGUAGE plpgsql;

`
  },
  "badt_dhs.LaboratoryProcess": {
    name: "badt_dhs.LaboratoryProcess",
    para: ["p_json"],
    returns: "JSON",
    codesql: `

CREATE OR REPLACE FUNCTION badt_dhs.LaboratoryProcess(
    p_json JSONB
)
RETURNS JSON AS
$$
DECLARE
-- Lastest commit: author:onghaup; date: 2025-11-13 14:44:23
--[NQHOA : 2025-10-31]: Bổ sung thêm biến để lấy XML đổ vào HOSO cho phù hợp với đơn vị sử dụng xn.sudungmauchuan = 9
--Theo YC : https://i.dh-his.com/hdhiswork/YEUCAU/issues/463
--[ÔNG TRIỆU HẬU: 2025-11-04]: Xử lý lấy lại trong current.psmotaxn 
--  https://storage.googleapis.com/calf-sure-sawfly.appspot.com/2025/11/04/DESKTOP-2FLMTI6-Zalo-2025-11-04-09h32p03.999.png
--  https://storage.googleapis.com/calf-sure-sawfly.appspot.com/2025/11/04/DESKTOP-2FLMTI6-Zalo-2025-11-04-09h32p12.521.png
-- 'UOMName',           COALESCE(cls.dvt,''),
--[ÔNG TRIỆU HẬU: 2025-11-13]: Thêm thứ tự lấy ưu tiên 
--[NQHOA : 2025-10-31]: bổ sung thêm kiểm tra theo phieukq được truyền vào json để lấy XML kết quả xét nghiệm phù hợp với sử dụng tham số xn.sudungmauchuan = 9
--[NQHOA : 2025-10-31]: Nếu v_phieukq tương ứng với không sử dụng tham số xn.sudungmauchuan = 9 thì mới UNION
    v_mabn TEXT         := p_json->>'PatientCode';
    v_makb TEXT         := p_json->>'AdmissionCode';
    v_maba TEXT         := p_json->>'MedicalRecordNo';
    v_maloai TEXT       := p_json->>'Maloai';
    v_ngaykcb TIMESTAMP := (p_json->>'NgayChiDinh')::timestamp;
    v_namkt TEXT        := p_json->>'NamKT';
    v_thangkt TEXT      := p_json->>'ThangKT';
    v_phieuchuan BOOLEAN := COALESCE((p_json->>'PhieuChuan')::BOOLEAN, false);
    v_phieukq NUMERIC := COALESCE((p_json->>'PhieuKQ')::NUMERIC, -1);
    v_result JSON;
BEGIN
    WITH result_chuan AS (
        SELECT
            json_build_object(
                'TPCode',            COALESCE(cd.iddienbien,''),
                'ParaClinReqCode',   COALESCE(cd.idchidinh,''),
                'PCReqDltVoucherNo', COALESCE(cd.idchidinh,'')||COALESCE(cd.macls,''),
                'PatientCode',       motaxn.mabn,
                'AdmissionCode',     motaxn.makb,
                'MedicalRecordNo',   COALESCE(cd.maba,''),
                'MaCha',             COALESCE(cls.macha,''),
                'MedSerCode',        motaxn.macls,
                'MedSerName',        cls.tencls,
                'UOMID',             NULL,
                'UOMCode',           NULL,
                'UOMName',           COALESCE(
                                        NULLIF(motaxn.dvt, ''),
                                        NULLIF(cls.dvt_emr, ''),
                                        NULLIF(cls.dvt, '')
                                     ),
                'ParaClinQty',       cd.soluong,
                'PCReqDtlNotes',     '',
                'NgayChiDinh',       to_char(motaxn.ngaykcb, 'YYYY-MM-DD HH24:MI:SS'),
                'NgayThucHien',      to_char(cd.giolaymau, 'YYYY-MM-DD HH24:MI:SS'),
                'NgayKetQua',        to_char(motaxn.ngayxn, 'YYYY-MM-DD HH24:MI:SS'),
                'MaMayThucHien',     COALESCE(motaxn.mamay,''),
                'MaDonViThucHien',   xn.madv,
                'MaPhongThucHien',   xn.maphong,
                'MaNhanVienThucHien', motaxn.manv_thuchien,
                'MaNhanVienTraKQ',   motaxn.nvthuchien,
                'csbt_nam',			 CASE WHEN cls.gioitinh IN (1,2) THEN COALESCE(cls.min,0)||'-'|| COALESCE(cls.max,0) ELSE '0-0' END,
                'csbt_nu',			 CASE WHEN cls.gioitinh IN (0,2) THEN COALESCE(cls.min,0)||'-'|| COALESCE(cls.max,0) ELSE '0-0' END,
                'KetQua',            COALESCE(motaxn.ketqua,''),
                'Type',				 COALESCE(cls.type,0),
                'BatThuong',         motaxn.batthuong::NUMERIC
            ) AS obj,
            motaxn.macls,
            cls.macha
        FROM current.psmotaxn motaxn
        JOIN current.pskhamxn xn
          ON motaxn.mabn = xn.mabn
         AND motaxn.makb = xn.makb
         AND motaxn.ngaykcb = xn.ngaykcb
         AND motaxn.ngayxn = xn.ngayxn
        JOIN current.chidinhcls cd
          ON motaxn.mabn = cd.mabn
         AND motaxn.makb = cd.makb
         AND motaxn.ngaykcb = cd.ngaykcb
         AND motaxn.macls = cd.macls
         AND cd.xoa = 0
         AND cd.thangkt = v_thangkt
         AND cd.namkt = v_namkt
        LEFT JOIN current.dmcls cls
          ON motaxn.macls = cls.macls
        LEFT JOIN current.dmloaicls loaicls
          ON cls.maloai = loaicls.maloai
        WHERE motaxn.mabn = v_mabn
          AND motaxn.makb = v_makb
          AND COALESCE(cd.maba,'') = v_maba
          AND motaxn.ngaykcb = v_ngaykcb
          AND COALESCE(cls.khimau,0) = 0
          AND ( 
          		(v_phieukq < 0 AND cls.maloai = v_maloai)
                OR
                (v_phieukq >= 0 and COALESCE(loaicls.phieukq,0) >=0)
          	  )
          AND (               
               (v_phieukq < 0
                    AND (
                        (v_phieuchuan = true  AND COALESCE(cls.inphieuchuan,0) = 1 AND COALESCE(cls.sttphieuchuan,0) != 0)
                        OR
                        (v_phieuchuan = false AND COALESCE(cls.inphieuchuan,0) = 0)
                    )
               )
               OR
               (v_phieukq >= 0 AND COALESCE(loaicls.phieukq,0) = v_phieukq)
          )
    ),
    result_cha AS (
        SELECT DISTINCT ON (cls_cha.macls)
            json_build_object(
                'TPCode',            COALESCE(cd.iddienbien,''),
                'ParaClinReqCode',   COALESCE(cd.idchidinh,''),
                'PCReqDltVoucherNo', cd.idchidinh||cd.macls,
                'PatientCode',       motaxn.mabn,
                'AdmissionCode',     motaxn.makb,
                'MedicalRecordNo',   COALESCE(cd.maba,''),
                'MaCha',             COALESCE(cls_cha.macha,''),
                'MedSerCode',        cls_cha.macls,
                'MedSerName',        cls_cha.tencls,
                'UOMID',             NULL,
                'UOMCode',           NULL,
                'UOMName',			 COALESCE(cls_cha.dvt,''),
                'ParaClinQty',       cd.soluong,
                'PCReqDtlNotes',     '',
                'NgayChiDinh',       to_char(motaxn.ngaykcb, 'YYYY-MM-DD HH24:MI:SS'),
                'NgayThucHien',      to_char(cd.giolaymau, 'YYYY-MM-DD HH24:MI:SS'),
                'NgayKetQua',        to_char(motaxn.ngayxn, 'YYYY-MM-DD HH24:MI:SS'),
                'MaMayThucHien',     COALESCE(motaxn.mamay,''),
                'MaDonViThucHien',   xn.madv,
                'MaPhongThucHien',   xn.maphong,
                'MaNhanVienThucHien', motaxn.manv_thuchien,
                'MaNhanVienTraKQ',   motaxn.nvthuchien,
                'csbt_nam',			 CASE WHEN cls_cha.gioitinh IN (1,2) THEN COALESCE(cls_cha.min,0)||'-'|| COALESCE(cls_cha.max,0) ELSE '0-0' END,
            	'csbt_nu',			 CASE WHEN cls_cha.gioitinh IN (0,2) THEN COALESCE(cls_cha.min,0)||'-'|| COALESCE(cls_cha.max,0) ELSE '0-0' END,
                'KetQua',            '',
                'Type',				 COALESCE(cls_cha.type,0),
                'BatThuong',         0
            ) AS obj
        FROM result_chuan rc
        JOIN current.dmcls cls_cha
          ON rc.macha = cls_cha.macls
        JOIN current.psmotaxn motaxn
          ON motaxn.macls = cls_cha.macls
         AND motaxn.mabn = v_mabn
         AND motaxn.makb = v_makb
         AND motaxn.ngaykcb = v_ngaykcb
        JOIN current.chidinhcls cd
          ON cd.macls = cls_cha.macls
         AND cd.mabn = v_mabn
         AND cd.makb = v_makb
         AND cd.ngaykcb = v_ngaykcb
         AND cd.xoa = 0
         AND cd.thangkt = v_thangkt
         AND cd.namkt = v_namkt
        JOIN current.pskhamxn xn
          ON motaxn.mabn = xn.mabn
         AND motaxn.makb = xn.makb
         AND motaxn.ngaykcb = xn.ngaykcb
         AND motaxn.ngayxn = xn.ngayxn
    )    
    SELECT COALESCE(json_agg(obj), '[]'::json)
    INTO v_result
    FROM (
        SELECT obj FROM result_chuan
        UNION ALL
        SELECT obj FROM result_cha
        WHERE v_phieukq < 0
    ) t;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

`
  },
  "notify_payload_on_insert": {
    name: "notify_payload_on_insert",
    para: [],
    returns: "TRIGGER",
    codesql: `

CREATE OR REPLACE FUNCTION notify_payload_on_insert()
RETURNS TRIGGER AS $$
DECLARE
-- Lastest commit: author:nqhoa1005; date: 2025-06-12 08:37:30
-- Lấy tencls từ bảng dmcls
    v_payload JSON;
    v_tencls TEXT;
BEGIN
    SELECT tencls INTO v_tencls
    FROM dmcls
    WHERE macls = NEW.macls;

    v_payload := json_build_object(
        'TPCode', NEW.iddienbien,
        'AdmissionCode', NEW.makb,
        'MedicalRecordNo', NEW.maba,
        'PatientCode', NEW.mabn,
        'EmployeeCode', NEW.manv,
        'ParaClinReqCode', NEW.idchidinh ||'_'||NEW.macls,
        'ParaClinRequests', json_build_array(
            json_build_object(
                'PCReqDltVoucherNo', '',
                'OrderNo', 1,
                'MedSerID', NEW.macls,
                'MedSerCode', NEW.macls,
                'MedSerName', v_tencls,
                'UOMID', NULL,
                'UOMCode', NULL,
                'ParaClinQty', NEW.soluong,
                'PCReqDtlNotes', '',
                'PatientObject', NEW.bhyt,
                'FromDate', NEW.ngaykcb,
                'ToDate', NEW.ngaykcb
            )
        )
    );

    PERFORM pg_notify('chidinhcls_notify', v_payload::text);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`
  },
};
