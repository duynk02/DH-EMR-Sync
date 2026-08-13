-- Thực hiện: NGUYỄN QUỐC HOÀ - 2025-05-22
-- Hàm: badt_dhs.getCUTPParaClinRequest(mabn)
-- Mô tả: Tạo chỉ dịnh cls
-- Sử dụng:
--   SELECT badt_dhs.getCUTPParaClinRequest('2025005370','2505003574','2025000616','CC3.20250528.093032','2025000616_20250528093139','05','2025');
-- ===============================================================
-- Gửi thành công [](https://i.ibb.co/jvVQv0wB/Postman-Ah-JB3kdd-VR.png)

CREATE OR REPLACE FUNCTION badt_dhs.getCUTPParaClinRequest(mabn TEXT, makb TEXT, maba TEXT, iddienbien TEXT, idchidinh TEXT, thangkt TEXT, namkt TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
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
