CREATE OR REPLACE FUNCTION notify_payload_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_payload JSON;
    v_tencls TEXT;
BEGIN
    -- Lấy tencls từ bảng dmcls
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