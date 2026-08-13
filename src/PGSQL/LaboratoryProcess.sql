CREATE OR REPLACE FUNCTION badt_dhs.LaboratoryProcess(
    p_json JSONB
)
RETURNS JSON AS
$$
DECLARE
    v_mabn TEXT         := p_json->>'PatientCode';
    v_makb TEXT         := p_json->>'AdmissionCode';
    v_maba TEXT         := p_json->>'MedicalRecordNo';
    v_maloai TEXT       := p_json->>'Maloai';
    v_ngaykcb TIMESTAMP := (p_json->>'NgayChiDinh')::timestamp;
    v_namkt TEXT        := p_json->>'NamKT';
    v_thangkt TEXT      := p_json->>'ThangKT';
    v_phieuchuan BOOLEAN := COALESCE((p_json->>'PhieuChuan')::BOOLEAN, false);
    --[NQHOA : 2025-10-31]: Bổ sung thêm biến để lấy XML đổ vào HOSO cho phù hợp với đơn vị sử dụng xn.sudungmauchuan = 9
    --Theo YC : https://i.dh-his.com/hdhiswork/YEUCAU/issues/463
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
                --[ÔNG TRIỆU HẬU: 2025-11-04]: Xử lý lấy lại trong current.psmotaxn 
                --  https://storage.googleapis.com/calf-sure-sawfly.appspot.com/2025/11/04/DESKTOP-2FLMTI6-Zalo-2025-11-04-09h32p03.999.png
                --  https://storage.googleapis.com/calf-sure-sawfly.appspot.com/2025/11/04/DESKTOP-2FLMTI6-Zalo-2025-11-04-09h32p12.521.png
                -- 'UOMName',           COALESCE(cls.dvt,''),
                --[ÔNG TRIỆU HẬU: 2025-11-13]: Thêm thứ tự lấy ưu tiên 
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
          --[NQHOA : 2025-10-31]: bổ sung thêm kiểm tra theo phieukq được truyền vào json để lấy XML kết quả xét nghiệm phù hợp với sử dụng tham số xn.sudungmauchuan = 9
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
        --[NQHOA : 2025-10-31]: Nếu v_phieukq tương ứng với không sử dụng tham số xn.sudungmauchuan = 9 thì mới UNION
        WHERE v_phieukq < 0
    ) t;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
