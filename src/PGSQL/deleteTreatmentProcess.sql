-- ===============================================================
-- Thực hiện: NGUYỄN TRIỀU VƯƠNG - 2025-07-08
-- Hàm: badt_dhs.deleteTreatmentProcess(input_json JSONB)
-- Mô tả:
--   - PatientCode			Mã số bệnh nhân
--   - MedicalRecordNo			Mã số bệnh án
--   - TPCode	ID diễn biến
-- Sử dụng:
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
-- Xóa quá trình điều trị từ EMR
*/
-- ===============================================================
CREATE OR REPLACE FUNCTION badt_dhs.deleteTreatmentProcess(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
 
  p_mabn TEXT := input_json->>'PatientCode';
  p_makh TEXT := input_json->>'MedicalRecordNo';  
  p_makb TEXT := input_json->>'AdmissionCode';
  p_iddienbien TEXT := input_json->>'TPCode';
  
  p_sohd TEXT := '';

  -- Biến dùng để gom thông tin trả về cho client
    v_exists           BOOLEAN;
    v_updated_inventory  INT := 0;
    v_deleted_detail     INT := 0;
    v_deleted_header     INT := 0;

    rec RECORD;
    r_ct RECORD;
    r_cls RECORD;
    r_thuoc RECORD;
BEGIN

    --[ÔNG TRIỆU HẬU: 2025-09-18] Kiểm tra trạng thái ra viện
    IF NOT EXISTS ( SELECT 1 FROM current.bnnoitru
        WHERE mabn = p_mabn AND makb = p_makb AND maba = p_makh AND COALESCE(ravien,0) = 0
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 
            format('Mabn: %L, Makb: %L, Maba: %L không tồn tại trong HIS (phải còn đang điều trị)', 
            p_mabn, p_makb, p_makh)
        );
    END IF;

    -- BẮT ĐẦU GIAO DỊCH
    BEGIN
        -- STEP 1: Kiểm tra chứng từ đã phát thuốc hoặc thu tiền
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

        -- STEP 2: Kiểm tra CLS đã thực hiện hoặc thu tiền
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

        -- STEP 3a: Lấy danh sách chứng từ để xử lý xóa
        RAISE NOTICE 'Lấy danh sách chứng từ để xử lý xóa';
        FOR r_ct IN
            SELECT mabn, makh, iddienbien, sohd
            FROM current.chungtu
            WHERE mabn = p_mabn 
                AND makh = p_makh 
                AND iddienbien = p_iddienbien
            	AND COALESCE(xoa,0) = 0
        LOOP
            -- Lặp qua danh sách hàng hóa từ pshdxn tương ứng
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
                -- Cập nhật tồn kho: giảm tamxuat
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

            -- Xóa pshdxn tương ứng
            RAISE NOTICE 'Xóa pshdxn tương ứng';
            UPDATE current.pshdxn
            SET    xoa = 1, ngayxoa = now()
            WHERE  sohd        = r_ct.sohd
              AND  iddienbien  = p_iddienbien
              AND  mabn        = p_mabn
              AND  makh        = p_makh;

            -- Xóa chungtu tương ứng
            RAISE NOTICE 'Xóa chungtu tương ứng';
            UPDATE current.chungtu
            SET    xoa = 1, ngayxoa = now()
            WHERE  sohd        = r_ct.sohd
              AND  iddienbien  = p_iddienbien
              AND  mabn        = p_mabn
              AND  makh        = p_makh;
              

              
        END LOOP;

        -- Xóa chidinhcls tương ứng
	RAISE NOTICE 'Xóa chidinhcls tương ứng';
	UPDATE current.chidinhcls
	SET    xoa = 1, ngayxoa = now()
	WHERE  iddienbien  = p_iddienbien
	  AND  mabn        = p_mabn
	  AND  maba        = p_makh;

        -- Xóa bnnoitru tương ứng
        RAISE NOTICE 'Xóa bnnoitru tương ứng';
        UPDATE current.bnnoitru
        SET    iddienbien = ''
        WHERE  iddienbien  = p_iddienbien
          AND  mabn        = p_mabn
          AND  maba        = p_makh;
          
        -- STEP 3b: XÓA QTDIEUTRI
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
        -- HOÀN TẤT
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

