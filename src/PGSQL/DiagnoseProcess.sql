CREATE OR REPLACE FUNCTION badt_dhs.DiagnoseProcess(
    p_json jsonb
)
RETURNS JSON AS
$$
DECLARE
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


