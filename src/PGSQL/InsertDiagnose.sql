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

CREATE OR REPLACE FUNCTION badt_dhs.InsertDiagnose(p_json JSONB)
RETURNS JSONB AS
$$
DECLARE
    -- Lấy dữ liệu từ JSON
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

    -- Tham số hệ thống
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

      --Kiểm tra nhân viên trả kết quả
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
       -- Kiểm tra mã máy thực hiện
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

    --[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
    --[ÔNG TRIỆU HẬU: 2025-09-25] Kiểm tra trạng thái ra viện, không kiểm tra nếu ngoại trú
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

    -- Kiểm tra tồn tại trong chidinhcls
    SELECT  cd.ngaykcb, cd.thangkt, cd.namkt,
            COALESCE(cd.dath,0) AS dath,
            COALESCE(cd.dathu,0) AS dathu,
            COALESCE(cd.dalappttt,0) AS dalappttt,
            --[ÔNG TRIỆU HẬU: 2025-11-10]: Lấy thêm các thông tin để xử lý toàn bộ điều kiện WHERE phía sau.
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
      --[ÔNG TRIỆU HẬU: 2025-10-14]:
        --  https://storage.googleapis.com/accurately-sharp-katydid.appspot.com/ShareX/2025/10/DESKTOP-2FLMTI6-Zalo-2025-10-14-18h22p37.976.png
        --  https://storage.googleapis.com/accurately-sharp-katydid.appspot.com/ShareX/2025/10/DESKTOP-2FLMTI6-explorer-2025-10-14-19h40p20.874.png
      -- Xử lý theo qui tắc EMR: chỉ định từ EMR => HIS (Kết quả sẽ gửi theo: PCReqDltVoucherNo: ParaClinReqCode  + MedSerCode)
        --  [Chỉ định tại HIS => EMR] theo : ParaClinReqCode,
        --  Đây là thông tin chỉ định tại HIS => EMR: CASE WHEN chidinhcls_noitru=0 AND maba_by_row= THEN NEW.makb||.||NEW.madv||.||NEW.maphong ELSE NEW.iddienbien END,
      -- Xử lý theo hướng, tìm trong chidinhcls, để lấy ngaykcb, xử lý toàn bộ phía sau.
      AND (cd.namkt||cd.thangkt) >= to_char(v_ngaykq_lui1thang,'YYYYMM')
      --[ÔNG TRIỆU HẬU: 2025-11-07]: Xử lý lại để gọn điều kiện, sử dụng CASE WHEN đối với v_huyketqua
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
                    --[Xử lý thêm để nhận và hủy kết quả khi đã chuyển CLS vào nội trú dưới HIS. https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/71]
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

    --[ÔNG TRIỆU HẬU: 2025-10-02]: Nếu có row trong chidinhcls thì cập nhật lại v_ngaycd = chidinhcls.ngaykcb
    --                             Để đảm bảo các logic phía sau không ảnh hưởng
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

      -- Kiểm tra khoảng thời gian thực hiện y lệnh
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

      -- Kiểm tra khoảng thời gian trả kết quả
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
      --Yêu cầu: Thêm ràng buộc thời gian trong xử lý nhận kết quả chẩn đoán hình ảnh từ EMR về HIS
      --https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/110
      --[NQHOA 2026-01-28] Bổ sung kiểm tra
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

      --Diagnose: Hỗ trợ trừ kho phim XQ khi nhận kết quả từ EMR
      --https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/108
      --[NQHOA 2026-01-30] Kiểm tra và trừ kho phim Xquang      

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
        -- Huỷ kết quả
        DELETE FROM current.pskhamha
        WHERE
            mabn = v_chidinhcls.mabn
            AND makb = v_chidinhcls.makb
            --[ÔNG TRIỆU HẬU: 2025-11-10: 11:03] Bỏ điều kiện này, vì không phù hợp đối với CLS chuyển vào nội trú.
            --AND COALESCE(maba,'') = v_chidinhcls.maba
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
         --Diagnose: Hỗ trợ trừ kho phim XQ khi nhận kết quả từ EMR
      	 --https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/108
      	 --[NQHOA 2026-01-30] Phục hồi phim Xquang theo tham số ha.phuchoiphim
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
             --[ÔNG TRIỆU HẬU: 2025-10-14]: Đổi lại điều kiện ngaykcb, lấy theo v_chidinhcls.ngaykcb,
             --                đã kiểm tra có tồn tại trong chidinhcls ở bước kiểm tra
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
                    -- lấy MOTA_IMAGE{i} không phân biệt hoa thường
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









