const configFunction = require("./configFunction");

const pgListener = {
  name: "badt_dhs",
  schema: "badt_dhs",
  table: "notifications",
  functionName: "create_badt_dhs_notifications",
  functionName_replay: "replay_notification_by_id",
};
const pgTableListener = {
  "current.bnnoitru": {
    ...configFunction["badt_dhs.getSyncADM"],
    schema: "current",
    table_name: "bnnoitru",
    TG_ARGV0: "mabn,makb,maba,bant,namvien,ravien",
    TG_ARGV1:
      "xoa,madv,ravien,madt,mathe,ngaybd,ngaykt,mabvdk,tuyen,ngayvv,ngayrv,tinhtrangvv,lydovv,buong,sogiuong,manvvv,manv,maicdvv,kqcdoanvv,maicdpvv,kqcdoanpvv,maphong",
  },
  "current.dmnhanvien": {
    ...configFunction["badt_dhs.GetSyncEmployee"],
    schema: "current",
    table_name: "dmnhanvien",
    TG_ARGV0: "manv,taikhoan",
    TG_ARGV1: "trangthai,holot,ten,ngaysinh,gioitinh,madv",
  },
  "current.dmdonvi": {
    ...configFunction["badt_dhs.GetSyncDepartment"],
    schema: "current",
    table_name: "dmdonvi",
    TG_ARGV0: "madv",
    TG_ARGV1: "tendv,vietngan,khoaduoc,ma_khoa_cv2348,trangthai,xoa",
  },
  "current.dmphong": {
    ...configFunction["badt_dhs.GetSyncRoom"],
    schema: "current",
    table_name: "dmphong",
    TG_ARGV0: "maphong",
    TG_ARGV1: "tenphong,madv",
  },
  "current.dmgiuongbenh": {
    ...configFunction["badt_dhs.GetSyncBed"],
    schema: "current",
    table_name: "dmgiuongbenh",
    TG_ARGV0: "ma_giuong",
    TG_ARGV1: "diengiai,sudung",
  },
  "current.dmloaicls": {
    ...configFunction["badt_dhs.getSyncMedSerType"],
    schema: "current",
    table_name: "dmloaicls",
    TG_ARGV0: "maloai",
    TG_ARGV1: "tenloai,kho",
  },
  "current.dmcls": {
    ...configFunction["badt_dhs.getSyncMedicalServiceItem"],
    schema: "current",
    table_name: "dmcls",
    TG_ARGV0: "macls",
    TG_ARGV1: "kho,tencls,sudung",
  },
  "current.dmkhocp": {
    ...configFunction["badt_dhs.GetSyncStoreHouse"],
    schema: "current",
    table_name: "dmkhocp",
    TG_ARGV0: "khocp",
    TG_ARGV1: "diengiai,loai,noitru,khoaduoc",
  },
  "current.dmkhoql": {
    ...configFunction["badt_dhs.GetSyncInvType"],
    schema: "current",
    table_name: "dmkhoql",
    TG_ARGV0: "khoql",
    TG_ARGV1: "diengiai,kho",
  },
  "current.dmthuoc": {
    ...configFunction["badt_dhs.GetSyncInventory"],
    schema: "current",
    table_name: "dmthuoc",
    TG_ARGV0: "mahh",
    TG_ARGV1: "khoql,tenhh,dvt,tenhc,hamluong,madd,nuocsx,quicachdg,xoa",
  },
  "current.qtdieutri": {
    ...configFunction["badt_dhs.getCUTreatmentProcess"],
    schema: "current",
    table_name: "qtdieutri",
    TG_ARGV0: "mabn,makb,maba,iddienbien",
    TG_ARGV1:
      "ngaygio,madv,manv,chamsoc,dienbien,kqcdoan,kqcdoanp,tenyhct,mayhct,maicd,maicdp,mach,nhiptho,nhietdo,cannang,chieucao,maphong,sogiuong",
  },
  "current.chungtu": {
    ...configFunction["badt_dhs.getCUTPPrescription"],
    schema: "current",
    table_name: "chungtu",
    TG_ARGV0: "mabn,makh,maba,sohd,kyhieu,loaitoa,tenkhbl,bant,noitru,iddienbien",
    TG_ARGV1: "iddienbien,sohd,xoa,manv,ghichu,ngayuong,ngayhd",
  },
  "current.chidinhcls": {
    ...configFunction["badt_dhs.getCUTPParaClinRequest"],
    schema: "current",
    table_name: "chidinhcls",
    TG_ARGV0: "mabn,makb,maba,macls,noitru,bant,iddienbien",
    TG_ARGV1: "macls,stt,soluong,iddienbien,idchidinh,manv,ngaykcb,xoa,kqcdoan,kqcdoanp",
  },
  "current.dmquocgia": {
    ...configFunction["badt_dhs.getSyncCountry"],
    schema: "current",
    table_name: "dmquocgia",
    TG_ARGV0: "maqg",
    TG_ARGV1: "tenqg",
  },
  "current.dmbenhnhan": {
    ...configFunction["badt_dhs.getSyncADM_ByDmbenhnhan"],
    schema: "current",
    table_name: "dmbenhnhan",
    TG_ARGV0: "mabn",
    TG_ARGV1: "holot,ten,ngaysinh,gioitinh,diachi,dienthoai,cmnd,maxa,ngaycap,matg,maqg,email,madt,manghe",
  },
  "current.psdangky": {
    ...configFunction["badt_dhs.getSyncADM_Ngoai"],
    schema: "current",
    table_name: "psdangky",
    TG_ARGV0: "mabn,makb,maba,bant",
    TG_ARGV1: "ngaydk,dain,ngayinphieu,maba,bant,madv_inphieu,mathe,ngaybd,ngaykt,mabvdk,loaiqh,hotenqh,cmndqh,diachiqh,dienthoaiqh,dvttuoi",
  },
  "current.chuyenphong": {
    ...configFunction["badt_dhs.getSyncPATFR_Ngoai"],
    schema: "current",
    table_name: "chuyenphong",
    TG_ARGV0: "mabn,makb",
    TG_ARGV1: "ngaychuyen,madvc,mapc,madvn,mapn,taikhoan,ketthuc",
  },
  "current.dmdantoc": {
    ...configFunction["badt_dhs.GetSyncEthnic"],
    schema: "current",
    table_name: "dmdantoc",
    TG_ARGV0: "ma_medisoft",
    TG_ARGV1: "ma_medisoft,tendt",
  },
  "current.dmnghe": {
    ...configFunction["badt_dhs.GetSyncOccupation"],
    schema: "current",
    table_name: "dmnghe",
    TG_ARGV0: "manghe",
    TG_ARGV1: "ma4750,tennghe,ma_medisoft",
  },
  "current.dmicd": {
    ...configFunction["badt_dhs.getSyncICD"],
    schema: "current",
    table_name: "dmicd",
    TG_ARGV0: "maicd",
    TG_ARGV1: "tenviet,xoa",
  },
};
const SQLCreateTable = () => {
  return `
  
DO $$
DECLARE
  v_schema_name text := '${pgListener.schema}';
  v_table_name text := '${pgListener.table}';
  idx_name text;
  idx_exists boolean;
BEGIN
  -- 1. Tạo schema nếu chưa tồn tại
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = v_schema_name
  ) THEN
    EXECUTE format('CREATE SCHEMA %I', v_schema_name);
  END IF;

  -- 2. Tạo bảng UNLOGGED nếu chưa tồn tại (chỉ cột id tạm)
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = v_table_name AND n.nspname = v_schema_name
  ) THEN
    EXECUTE format('CREATE UNLOGGED TABLE %I.%I (id SERIAL PRIMARY KEY)', v_schema_name, v_table_name);
  END IF;

  -- 3. Thêm các cột nếu chưa tồn tại
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'table_name'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN table_name VARCHAR(100)', v_schema_name, v_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'operation'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN operation VARCHAR(10) NOT NULL', v_schema_name, v_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'payload'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN payload JSONB NOT NULL', v_schema_name, v_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'processed'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN processed BOOLEAN DEFAULT FALSE', v_schema_name, v_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'retry_count'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN retry_count INTEGER DEFAULT 0', v_schema_name, v_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'created_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP', v_schema_name, v_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'updated_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP', v_schema_name, v_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema_name AND table_name = v_table_name AND column_name = 'processed_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN processed_at TIMESTAMPTZ', v_schema_name, v_table_name);
  END IF;

  -- 4. Tạo index idx_processed
  idx_name := 'idx_' || v_table_name || '_processed';
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = idx_name AND n.nspname = v_schema_name
  ) INTO idx_exists;

  IF NOT idx_exists THEN
    EXECUTE format('CREATE INDEX %I ON %I.%I(processed)', idx_name, v_schema_name, v_table_name);
  END IF;

  -- 5. Tạo index idx_processed_retry
  idx_name := 'idx_' || v_table_name || '_processed_retry';
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = idx_name AND n.nspname = v_schema_name
  ) INTO idx_exists;

  IF NOT idx_exists THEN
    EXECUTE format('CREATE INDEX %I ON %I.%I(processed, retry_count)', idx_name, v_schema_name, v_table_name);
  END IF;

  -- 6. Tạo index idx_created_at
  idx_name := 'idx_' || v_table_name || '_created_at';
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = idx_name AND n.nspname = v_schema_name
  ) INTO idx_exists;

  IF NOT idx_exists THEN
    EXECUTE format('CREATE INDEX %I ON %I.%I(created_at)', idx_name, v_schema_name, v_table_name);
  END IF;

  -- 7. Tạo index idx_table_name
  idx_name := 'idx_' || v_table_name || '_table_name';
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = idx_name AND n.nspname = v_schema_name
  ) INTO idx_exists;

  IF NOT idx_exists THEN
    EXECUTE format('CREATE INDEX %I ON %I.%I(table_name)', idx_name, v_schema_name, v_table_name);
  END IF;

END
$$;
`;
};
const SQLCreateFunction = () => {
  return `
CREATE OR REPLACE FUNCTION ${pgListener.schema}.${pgListener.functionName}() RETURNS trigger AS $$
DECLARE
  payload JSONB;
  notification_id INTEGER;
  fixed_cols TEXT[];
  changed_cols TEXT[];
  notify_channel TEXT := TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;
  dest_schema TEXT := 'badt_dhs';            -- <-- Thay schema đích lưu thông báo tại đây
  dest_table TEXT := 'notifications'; -- <-- Thay bảng đích lưu thông báo tại đây
  changed_fields JSONB := '{}';
  col TEXT;
  old_val TEXT;
  new_val TEXT;
  insert_sql TEXT;
  senddata JSONB; -- Cái này là phần thêm dữ liệu JSON cho trường senddata
  dmcls_row RECORD; -- Sử dụng record để lưu trữ kết quả từ bảng dmcls
  bnnoitru_namvien INTEGER; -- Khai báo biến namvien
  qtdieutri_maba TEXT; 
  chidinhcls_noitru INTEGER; 
  chungtu_noitru INTEGER; 
  api INTEGER; 
  chuyenphong_maba TEXT; 
  row RECORD; -- Sử dụng record để lưu trữ kết quả từ bảng khác
  maba_by_row TEXT; -- Sử dụng để lấy giá trị maba ở các Row khác nhau
  pathApi TEXT; -- Sử dụng cấu hình pathApi
  makh_by_row TEXT; -- Sử dụng để lấy giá trị makh ở các Row khác nhau
  bant_by_row INTEGER; -- Sử dụng để lấy giá trị bant ở các Row khác nhau
  triggerRow RECORD; --Sử dụng record để kiểm tra theo NEW or OLD
BEGIN
  --Xử lý lấy thông tin triggerRow đang xảy ra
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        triggerRow := NEW;  -- dùng dữ liệu mới
  ELSE
        triggerRow := OLD;  -- dùng dữ liệu cũ (ví dụ DELETE)
  END IF;

  --✖️ Xử lý bỏ qua các trường không cần xử lý, tránh tình trạng treo và gửi dữ liệu không cần thiết ✖️

  --------------✖️ current.bnnoitru ✖️--------------
  --[ÔNG TRIỆU HẬU - 2025-07-12]: Bỏ trường hợp này để gửi dữ liệu bệnh án ngoại trú
  --IF TG_TABLE_NAME = 'bnnoitru' THEN
  --  bnnoitru_namvien := CASE WHEN TG_OP='INSERT' THEN NEW.namvien ELSE OLD.namvien END;
  --  IF bnnoitru_namvien != 1 THEN
  --    RETURN NULL; -- Nếu namvien không phải 1, bỏ qua không thực hiện tiếp theo
  --  END IF;
  --END IF;  
  --------------✖️ current.bnnoitru ✖️--------------

  --------------✖️ current.qtdieutri ✖️--------------
  IF TG_TABLE_NAME = 'qtdieutri' THEN
    qtdieutri_maba := CASE WHEN TG_OP='INSERT' THEN NEW.maba ELSE OLD.maba END;
    api := CASE WHEN TG_OP='INSERT' THEN COALESCE(NEW.api,0) ELSE COALESCE(OLD.api,0) END;
    --[ÔNG TRIỆU HẬU - 2025-07-28]: Mở ra đối với Bệnh án ngoại trú [Bỏ ra: OR LEFT(qtdieutri_maba, 1)='N']
    IF api=1 OR COALESCE(qtdieutri_maba,'')='' THEN 
      RETURN NULL; -- Bỏ qua nếu maba Rỗng và bắt đầu N
    END IF;
  END IF; 
  --------------✖️ current.qtdieutri ✖️--------------

  --------------✖️ current.chidinhcls ✖️--------------
  IF TG_TABLE_NAME = 'chidinhcls' THEN
    chidinhcls_noitru := CASE WHEN TG_OP='INSERT' THEN COALESCE(NEW.noitru,0) ELSE COALESCE(OLD.noitru,0) END;
    api := CASE WHEN TG_OP='INSERT' THEN COALESCE(NEW.api,0) ELSE COALESCE(OLD.api,0) END;
    maba_by_row := CASE WHEN TG_OP='INSERT' THEN COALESCE(NEW.maba,'') ELSE COALESCE(OLD.maba,'') END;
    --[ÔNG TRIỆU HẬU - 2025-07-28]: Mở ra đối với Bệnh án ngoại trú [Bỏ ra: OR (COALESCE(chidinhcls_noitru,0) = 0 AND LEFT(maba_by_row, 1)='N')]
    --[ÔNG TRIỆU HẬU - 2025-08-17]: Thêm chức năng không gửi khi chưa có manv, vì EMR không chấp nhận (mới đăng ký khám bệnh, chưa khám,...)
    IF api=1 OR COALESCE(triggerRow.manv,'')='' THEN
      RETURN NULL; -- Không xử lý, nếu api=1 hoặc chỉ định thuộc có maba mà không phải nội trú
    END IF;
  END IF; 
  --------------✖️ current.chidinhcls ✖️--------------
  
  --------------✖️ current.chungtu ✖️--------------
  IF TG_TABLE_NAME = 'chungtu' THEN
    chungtu_noitru := CASE WHEN TG_OP='INSERT' THEN NEW.noitru ELSE OLD.noitru END;
    api := CASE WHEN TG_OP='INSERT' THEN COALESCE(NEW.api,0) ELSE COALESCE(OLD.api,0) END;
    maba_by_row := CASE WHEN TG_OP='INSERT' THEN COALESCE(NEW.maba,'') ELSE COALESCE(OLD.maba,'') END;
    makh_by_row := CASE WHEN TG_OP='INSERT' THEN COALESCE(NEW.makh,'') ELSE COALESCE(OLD.makh,'') END;
    bant_by_row := CASE WHEN TG_OP='INSERT' THEN COALESCE(NEW.bant,0) ELSE COALESCE(OLD.bant,0) END;
    --[ÔNG TRIỆU HẬU - 2025-07-28]: Mở ra đối với Bệnh án ngoại trú
    --[ÔNG TRIỆU HẬU - 2025-08-17]: Bắt thêm theo loaixn để không xử lý
    IF api=1 OR 
      (chungtu_noitru = 0 AND maba_by_row='') OR 
      COALESCE(triggerRow.loaixn,'') NOT IN ('xbb','tto','nkt') 
      THEN
        RETURN NULL; -- Không xử lý, nếu noitru khác 1
    END IF;
  END IF; 
  --------------✖️ current.chungtu ✖️--------------

  --------------✖️ current.chuyenphong ✖️--------------
  IF TG_TABLE_NAME = 'chuyenphong' THEN
    chuyenphong_maba := CASE 
        WHEN TG_OP='INSERT' THEN COALESCE(NEW.maba,'')
        WHEN TG_OP='DELETE' THEN COALESCE(OLD.maba,'')
        ELSE 'KHONGXULY'
      END;
    IF chuyenphong_maba<>'' THEN
      RETURN NULL; -- Không xử lý, nếu maba khác rỗng
    END IF;
  END IF; 
  --------------✖️ current.chuyenphong ✖️--------------


  -- Lấy danh sách cột cố định và cột thay đổi từ TG_ARGV
  fixed_cols := string_to_array(TG_ARGV[0], ',');
  changed_cols := string_to_array(TG_ARGV[1], ',');

  -- Nếu bảng là current.chidinhcls, ta sẽ xây dựng senddata như một phần của payload
  IF TG_TABLE_NAME = 'chidinhcls' THEN

    --[ÔNG TRIỆU HẬU: 2025-08-14] Xử lý không gửi EMR khi manv rỗng
    -- Chỉ xử lý INSERT/UPDATE và kiểm tra manv rỗng, vì 'EmployeeCode' rỗng, EMR không nhận
    IF TG_OP IN ('INSERT', 'UPDATE') AND COALESCE(NEW.manv, '') = '' THEN
      RETURN NULL; -- Không gửi EMR khi manv rỗng
    END IF;

    -- Truy vấn lấy tencls và dvt từ bảng current.dmcls và lưu vào record dmcls_row
    --[ÔNG TRIỆU HẬU: 2025-08-13] Xử lý ngoại trú không đưa các CLS con
    SELECT tencls, dvt, COALESCE(macha,'') AS macha, COALESCE(laybo,0) AS laybo INTO dmcls_row
    FROM current.dmcls
    WHERE macls = NEW.macls;

    --[ÔNG TRIỆU HẬU: 2025-08-13] Xử lý ngoại trú không đưa các CLS con
    IF chidinhcls_noitru=0 AND maba_by_row='' AND dmcls_row.macha <> '' AND dmcls_row.laybo = 1 THEN
      RETURN NULL; -- Không xử lý, nếu đối với các CLS con
    END IF;


    
    IF chidinhcls_noitru=0 AND maba_by_row='' THEN
      pathApi='server/his-server/api/Connect/CUTPParaClinRequestOUT';
    END IF;

    

    -- Tạo cấu trúc senddata với các trường cần thiết, để thực hiện gửi liền, chỗ services không cần phải lấy lại thông tin chỉ định, tránh treo
    senddata := jsonb_build_object(
      'pathApi', pathApi,
      'TPCode', NEW.iddienbien,
      'AdmissionCode', NEW.makb,
      'MedicalRecordNo', NEW.maba,
      'PatientCode', NEW.mabn,
      'EmployeeCode', NEW.manv,
      'DepartmentCode', CASE WHEN chidinhcls_noitru=0 AND maba_by_row='' THEN NEW.maphong ELSE NEW.madv END, --[ÔNG TRIỆU HẬU: 2025-09-12]: https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/22
      'RoomCode', NEW.maphong,
      --'DiagnosisDesc', TRIM(BOTH ';' FROM COALESCE(NEW.kqcdoan,'')||';'||COALESCE(NEW.kqcdoanp,'')),
      'ParaClinReqCode', CASE WHEN chidinhcls_noitru=0 AND maba_by_row='' THEN NEW.makb||'.'||NEW.madv||'.'||NEW.maphong ELSE NEW.iddienbien END,
      'ParaClinRequests', jsonb_build_array(
        jsonb_build_object(
          'PCReqDltVoucherNo', COALESCE(NEW.idchidinh, '')||COALESCE(NEW.macls, ''),
          'OrderNo', NEW.stt,
          'MedSerID', 'null'::jsonb,
          'MedSerCode', NEW.macls,
          'MedSerName', dmcls_row.tencls,  -- Sử dụng trực tiếp dmcls_row.tencls thay cho NEW.MedSerName
          'UOMID', 'null'::jsonb,
          'UOMCode', dmcls_row.dvt,
          'ParaClinQty', NEW.soluong,
          'PCReqDtlNotes', COALESCE(NEW.tenclsphu, ''),
          'PatientObject', 1,
          --[ÔNG TRIỆU HẬU - 20250729]: Thay đổi múi giờ Asia/Ho_Chi_Minh khi gửi CLS, Bổ sung định dạng VN
          'FromDate', TO_CHAR(NEW.ngaykcb AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD"T"HH24:MI:SS'),
          'ToDate', TO_CHAR(NEW.ngaykcb AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'FromDateVN', TO_CHAR(NEW.ngaykcb, 'YYYY-MM-DD HH24:MI:SS'),
          'ToDateVN', TO_CHAR(NEW.ngaykcb, 'YYYY-MM-DD HH24:MI:SS')
        )
      ),
      'DiagnosisDesc', TRIM(BOTH ';' FROM COALESCE(NEW.kqcdoan,'')||';'||COALESCE(NEW.kqcdoanp,''))
    );
  END IF;

  
  -- Nếu bảng là current.chuyenphong, ta sẽ xây dựng senddata như một phần của payload
  IF TG_TABLE_NAME = 'chuyenphong' THEN
    DECLARE
      cp_mabn       VARCHAR;
      cp_makb       VARCHAR;
      cp_madv       VARCHAR;
      cp_maphong_cu VARCHAR;
      cp_maphong_moi VARCHAR;
      cp_ngaychuyen TIMESTAMP;
    BEGIN
      -- Gán giá trị dựa trên operation
      IF TG_OP = 'DELETE' THEN
        -- DELETE: chỉ có OLD
        cp_mabn        := OLD.mabn;
        cp_makb        := OLD.makb;
        cp_madv        := OLD.madvn;
        cp_maphong_cu  := OLD.mapn;
        cp_maphong_moi := OLD.mapc;
        cp_ngaychuyen  := COALESCE(OLD.ngaychuyen, NOW());
      ELSE
        -- INSERT/UPDATE: ưu tiên NEW, fallback OLD (chỉ có ý nghĩa với UPDATE)
        cp_mabn        := COALESCE(NEW.mabn,       OLD.mabn);
        cp_makb        := COALESCE(NEW.makb,       OLD.makb);
        cp_madv        := COALESCE(NEW.madvc,      OLD.madvn);
        cp_maphong_cu  := COALESCE(NEW.mapc,       OLD.mapn);
        cp_maphong_moi := COALESCE(NEW.mapn,       OLD.mapc);
        cp_ngaychuyen  := COALESCE(NEW.ngaychuyen, OLD.ngaychuyen, NOW());
      END IF;

      -- Truy vấn một lần
      SELECT manv, kqcdoan
      INTO row
      FROM current.khambenh
      WHERE mabn    = cp_mabn
        AND makb    = cp_makb
        AND madv    = cp_madv
        AND maphong = cp_maphong_cu;

      -- Xây dựng senddata một lần duy nhất
      senddata := jsonb_build_object(
        'AdmissionCode',             cp_makb,
        'OldDepartmentCode',         cp_maphong_cu,
        'DepartmentCode',            cp_maphong_moi,
        'RoomID',                    cp_maphong_moi,
        'OldRoomID',                 cp_maphong_cu,
        'BedID',                     '',
        'TransferDate',              TO_CHAR(cp_ngaychuyen, 'YYYY-MM-DD HH24:MI'),
        'TransferNotes',             'Chuyển phòng khám bệnh',
        'TransferStatus',            0,
        'OrderNum',                  1,
        'PatientStatus',             '',
        'Diagnosis',                 row.kqcdoan,
        'TransferReason',            '',
        'TreatmentDoctorCode',       row.manv,
        'TreatmentDepartmentCode',   ''
      );
    END;
  END IF;

  -- Nếu bảng là current.bnnoitru và NEW.madv<>OLD.madv => tạo senddata
  IF TG_TABLE_NAME = 'bnnoitru' AND TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.madv,'') <> COALESCE(OLD.madv,'')  AND COALESCE(NEW.madv,'') || COALESCE(OLD.madv,'') <> '' 
    THEN
      -- Tạo cấu trúc senddata với các trường cần thiết, để thực hiện gửi liền, chỗ services không cần phải lấy lại thông tin chỉ định, tránh treo
      senddata := jsonb_build_object(
        'AdmissionCode', NEW.makb,
        'OldDepartmentCode', COALESCE(OLD.madv,''),  -- Mã khoa chuyển
        'DepartmentCode', COALESCE(NEW.madv,''),     -- Mã khoa mới
        'RoomID', '',
        'OldRoomID', COALESCE(NEW.buong,''),
        'BedID', COALESCE(NEW.sogiuong,''),          -- Giường
        'TransferDate', TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI'), -- Ngày chuyển
        'TransferNotes', 'Chuyển khoa',
        'TransferStatus', 0,
        'OrderNum', 1,
        'PatientStatus', '',
        'Diagnosis', COALESCE(NEW.kqcdoan,''),       -- Chẩn đoán
        'TransferReason','',                         -- Lý do chuyển
        'TreatmentDoctorCode', COALESCE(NEW.manv,''),-- BS điều trị
        'TreatmentDepartmentCode','',
        'IsOutPatient', CASE WHEN LEFT(NEW.maba, 1) = 'N' THEN 1 ELSE 0 END
      );
    END IF;
  END IF;

  -- Kiểm tra các loại thao tác: INSERT, UPDATE, DELETE
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object('operation', TG_OP);

    -- Lặp qua các cột cố định và thêm vào payload
    FOREACH col IN ARRAY fixed_cols LOOP
      EXECUTE format('SELECT $1.%I::text', col) INTO new_val USING NEW;

      IF new_val IS NOT NULL THEN
        payload := jsonb_set(payload, ARRAY[col], to_jsonb(new_val));
      ELSE
        payload := jsonb_set(payload, ARRAY[col], 'null'::jsonb);
      END IF;
    END LOOP;

  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object('operation', TG_OP);

    -- Lặp qua các cột cố định
    FOREACH col IN ARRAY fixed_cols LOOP
      EXECUTE format('SELECT $1.%I::text', col) INTO new_val USING NEW;

      IF new_val IS NOT NULL THEN
        payload := jsonb_set(payload, ARRAY[col], to_jsonb(new_val));
      ELSE
        payload := jsonb_set(payload, ARRAY[col], 'null'::jsonb);
      END IF;
    END LOOP;

    -- Lặp qua các cột thay đổi
    FOREACH col IN ARRAY changed_cols LOOP
      EXECUTE format('SELECT $1.%I::text, $2.%I::text', col, col) INTO old_val, new_val USING OLD, NEW;

      IF old_val IS DISTINCT FROM new_val THEN
        IF new_val IS NOT NULL THEN
          changed_fields := changed_fields || jsonb_build_object(
            col, jsonb_build_object('old', old_val, 'new', new_val)
          );
        ELSE
          changed_fields := changed_fields || jsonb_build_object(
            col, jsonb_build_object('old', old_val, 'new', 'null'::jsonb)
          );
        END IF;
      END IF;
    END LOOP;

    IF changed_fields = '{}'::jsonb THEN
      RETURN NULL;
    END IF;

    payload := jsonb_set(payload, '{changed_fields}', to_jsonb(changed_fields));

  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object('operation', TG_OP);

    -- Lặp qua các cột cố định
    FOREACH col IN ARRAY fixed_cols LOOP
      EXECUTE format('SELECT $1.%I::text', col) INTO old_val USING OLD;

      IF old_val IS NOT NULL THEN
        payload := jsonb_set(payload, ARRAY[col], to_jsonb(old_val));
      ELSE
        payload := jsonb_set(payload, ARRAY[col], 'null'::jsonb);
      END IF;
    END LOOP;
  END IF;

  -- Nếu senddata có giá trị thì thêm vào payload
  IF senddata IS NOT NULL AND senddata <> '{}'::jsonb 
  THEN
      payload := jsonb_set(payload, '{senddata}', senddata);
  END IF;



  -- Chuẩn bị câu lệnh insert động với schema và table đích
  insert_sql := format(
    'INSERT INTO %I.%I(table_name, operation, payload) VALUES ($1, $2, $3) RETURNING id',
    dest_schema, dest_table
  );

  -- Thực thi insert, lấy id trả về
  EXECUTE insert_sql USING notify_channel, TG_OP, payload INTO notification_id;

  -- Cập nhật payload thêm notification_id và channel
  payload := jsonb_set(payload, '{notification_id}', to_jsonb(notification_id));
  payload := jsonb_set(payload, '{channel}', to_jsonb(notify_channel));

  -- Gửi notify với payload đã được cập nhật
  PERFORM pg_notify('${pgListener.name}', payload::text);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


  `;
};
const SQLCreate_BenhnhanSynced = () => {
  return `
-- 1. Tạo bảng UNLOGGED nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'badt_dhs' AND table_name = 'benhnhan_synced'
    ) THEN
        EXECUTE '
            CREATE UNLOGGED TABLE badt_dhs.benhnhan_synced (
                id serial PRIMARY KEY
            )';
    END IF;
END$$;

-- 2. Thêm các cột nếu chưa có
DO $$
DECLARE
    col record;
BEGIN
    FOR col IN
        SELECT * FROM (
            VALUES 
                ('table_name',  'text'),
                ('operation',   'text'),
                ('payload',     'jsonb'),
                ('pathapi',     'text'),
                ('resultapi',   'jsonb'),
                ('created_at',  'timestamptz'),
                ('mabn',        'text'),
                ('makb',        'text'),
                ('maba',        'text'),
                ('type',        'text')
        ) AS cols(name, type)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'badt_dhs' AND table_name = 'benhnhan_synced' AND column_name = col.name
        ) THEN
            EXECUTE format(
                'ALTER TABLE badt_dhs.benhnhan_synced ADD COLUMN %I %s',
                col.name, col.type
            );
        END IF;
    END LOOP;
END$$;

-- 3. Tạo index nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'badt_dhs' AND tablename = 'benhnhan_synced' AND indexname = 'idx_benhnhan_synced_mabn_maba_makb'
    ) THEN
        EXECUTE '
            CREATE INDEX idx_benhnhan_synced_mabn_maba_makb
            ON badt_dhs.benhnhan_synced (mabn, maba, makb)';
    END IF;
END$$;
  
`;
};
const SQLCreateTrigger = ({ schema = "current", table_name = "bnnoitru", TG_ARGV0 = "mabn,makb,maba", TG_ARGV1 = "xoa,madv,ravien" } = {}) => {
  //   -- TG_ARGV[0]: cột cố định luôn lấy trong payload
  //   -- TG_ARGV[1]: cột cần theo dõi thay đổi trong UPDATE
  let trigger_name = `trg_notify_${schema}_${table_name}_changes`;
  return `
DROP TRIGGER IF EXISTS ${trigger_name} ON ${schema}.${table_name};
CREATE TRIGGER ${trigger_name}
AFTER INSERT OR UPDATE OF ${TG_ARGV1} OR DELETE ON ${schema}.${table_name}
FOR EACH ROW
EXECUTE FUNCTION ${pgListener.schema}.${pgListener.functionName}('${TG_ARGV0}','${TG_ARGV1}');
  `;
};
const SQLCreate_replay_notification_by_id = () => {
  return `
DROP FUNCTION IF EXISTS ${pgListener.schema}.${pgListener.functionName_replay};
CREATE OR REPLACE FUNCTION ${pgListener.schema}.${pgListener.functionName_replay}(p_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_payload JSONB;
    v_channel TEXT;
BEGIN
    -- Lấy payload và tên kênh từ bảng notifications
    SELECT payload, table_name INTO v_payload, v_channel
    FROM ${pgListener.schema}.${pgListener.table}
    WHERE id = p_id;

    IF v_payload IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy payload với id = %', p_id;
    END IF;

    -- Cập nhật payload với channel và notification_id
    v_payload := jsonb_set(v_payload, '{channel}', to_jsonb(v_channel));
    v_payload := jsonb_set(v_payload, '{notification_id}', to_jsonb(p_id));

    -- Gửi lại notification với payload đã cập nhật
    PERFORM pg_notify('${pgListener.name}', v_payload::text);
END;
$$ LANGUAGE plpgsql;
  `;
};
const initSQLs = (() => {
  let arrSQL = [];
  arrSQL.push(SQLCreateTable());
  arrSQL.push(SQLCreate_BenhnhanSynced());
  arrSQL.push(SQLCreateFunction());
  arrSQL.push(SQLCreate_replay_notification_by_id());

  for (let key in pgTableListener) {
    arrSQL.push(pgTableListener[key].codesql);
    arrSQL.push(SQLCreateTrigger(pgTableListener[key]));
  }
  //Bổ sung tự do, current.bnnoitru
  arrSQL.push(configFunction["badt_dhs.getSyncPATFR"].codesql);
  arrSQL.push(configFunction["badt_dhs.getSyncDCHG"].codesql);
  arrSQL.push(configFunction["badt_dhs.GetSyncCityProvince"].codesql);
  arrSQL.push(configFunction["badt_dhs.GetSyncDistrict"].codesql);
  arrSQL.push(configFunction["badt_dhs.GetSyncWard"].codesql);
  //Xử lý xuất viện ngoại trú
  arrSQL.push(configFunction["badt_dhs.getSyncDCHG_Ngoai_Khambenh"].codesql);
  //Xử lý hàm lấy thông tin gửi kết quả ký số lên EMR (DiagnoseProcess và LaboratoryProcess)
  arrSQL.push(configFunction["badt_dhs.DiagnoseProcess"].codesql);
  arrSQL.push(configFunction["badt_dhs.LaboratoryProcess"].codesql);
  const addCreate_dmcls_dvt_emr = (() => {
    arrSQL.push(`DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'current'
                AND table_name = 'dmcls'
                AND column_name = 'dvt_emr'
          ) THEN
              EXECUTE 'ALTER TABLE current.dmcls ADD COLUMN dvt_emr VARCHAR(50)';
          END IF;
      END;
      $$;
    `);
  })();
  return arrSQL;
})();
module.exports = {
  pgListener,
  SQL: {
    initSQLs: initSQLs,
  },
  pgTableListener,
  configFunction,
};
