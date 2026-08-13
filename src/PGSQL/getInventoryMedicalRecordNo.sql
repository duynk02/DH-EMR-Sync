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

CREATE OR REPLACE FUNCTION badt_dhs.getInventoryMedicalRecordNo(mahh TEXT,mabn TEXT, maba TEXT, IsTuTruc BOOLEAN, IsNhaThuoc BOOLEAN, IsDongYThanhPham BOOLEAN, IsDongYThuocThang BOOLEAN)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
  p_mahh ALIAS FOR mahh;
  p_mabn ALIAS FOR mabn;
  p_maba ALIAS FOR maba;
  p_istutruc ALIAS FOR IsTuTruc;		                --NQHOA 2025-07-25 : bổ sung nhận biết lấy thuốc từ tủ trực => ưu tiên nếu p_istutruc = true
  p_isnhathuoc ALIAS FOR IsNhaThuoc;	              --NQHOA 2025-07-25 : bổ sung nhận biết lấy thuốc từ nhà thuốc => IsTuTruc = false và IsNhaThuoc = true
  p_isDongYThanhPham ALIAS FOR IsDongYThanhPham;	  --ÔNG TRIỆU HẬU - 2025-09-08 : Thêm chức năng lấy kho Đông y Thành phẩm
  p_isDongYThuocThang ALIAS FOR IsDongYThuocThang;	--ÔNG TRIỆU HẬU - 2025-09-08 : 
                                                    --Thêm chức năng lấy kho Đông y Thuốc thang, tạo sẵn, chưa xử lý

  								
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
  -- Lấy madt
    SELECT madt, madv, maicd, kqcdoan, maicdp, kqcdoanp INTO madt_nt, madv_nt, maicd_nt, kqcdoan_nt, maicdp_nt, kqcdoanp_nt -- lấy cho đủ số liệu
    FROM current.bnnoitru nt
    WHERE nt.mabn = p_mabn AND nt.maba = p_maba
	  LIMIT 1 ;

    --NTVUONG 2025-08-25 : Kiểm tra thông tin bệnh
    IF NOT FOUND THEN
       RETURN json_build_object(
            'status', 'error',
            'message', format('Không tìm thấy bệnh nhân với PatientCode = %s, MedicalRecordNo = %s', p_mabn, p_maba)
       )::text;
    END IF;

    -- Xử lý trường hợp p_isDongYThuocThang = true trả về dữ liệu trống
    IF p_isDongYThuocThang = TRUE THEN
        RETURN '[]'::text;
    END IF;
    

    -- Lấy khocp theo đối tượng
    IF p_isDongYThanhPham = TRUE THEN
        -- ÔNG TRIỆU HẬU - 2025-09-08 : Lấy khocp cho Đông y Thành phẩm
        -- => Không còn phù hợp, trường hợp Vĩnh Thạnh, lấy sai kho 01: nhưng cấu hình máy dongy=1
        -- SELECT khocp INTO khocp_dt FROM current.dmkhocp WHERE loai = 2 AND dongy = 1 LIMIT 1;
        -- ÔNG TRIỆU HẬU - 2025-09-20 : Lấy theo Cấu hình máy của Treatment, lấy cùng khoa với bệnh nhân,
        --  có cấu hình Đông Y để ra toa
        SELECT DISTINCT msdvcp INTO khocp_dt FROM current.cauhinhmay 
        WHERE module='Treatment' AND COALESCE(dongycapcuu,0)=1 AND COALESCE(msdvcp,'')<>''
          AND madv=madv_nt LIMIT 1;

        -- [ÔNG TRIỆU HẬU - 2025-09-08] : Kiểm tra nếu không tìm thấy khocp thì trả về dữ liệu trống
        -- ![](https://live.staticflickr.com/65535/54780372742_70d29647db_b.jpg)
        IF khocp_dt IS NULL THEN
            RETURN '[]'::text;
        END IF;
    ELSE
        -- Logic gốc cho các trường hợp khác
        SELECT khocp INTO khocp_dt FROM current.dmdoituongkhocp WHERE madt= madt_nt and (noitru = 1 or noitru = 2) ORDER BY noitru LIMIT 1;
    END IF;
    -- -- Lấy khocp theo đối tượng
    -- SELECT khocp INTO khocp_dt FROM current.dmdoituongkhocp WHERE madt= madt_nt and (noitru = 1 or noitru = 2) ORDER BY noitru LIMIT 1;    
    
    IF p_istutruc = TRUE THEN 
      -- Lấy list mã tủ trực thuộc khoa
      --NQHOA 2025-07-25 : đổ kết quả tủ trực thuộc bnnoitru.madv 
      --                   để tìm kiếm tồn kho nếu lấy thuốc từ tủ trực (IsTuTruc = true)
      SELECT array_agg(madv)::TEXT[] INTO kho_tutruc				                                                                  
		  FROM current.dmdonvi 
		  WHERE loaidv = 3 AND COALESCE(vietngan, '') = madv_nt;

      -- Kiểm tra và xử lý trường hợp không có dữ liệu
      IF kho_tutruc IS NULL OR array_length(kho_tutruc, 1) IS NULL THEN
          RETURN '[]'::text;
      END IF;
    END IF;

    -- Lấy tháng/năm kế toán
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
         --[ÔNG TRIỆU HẬU - 2025-08-04]: Chỉnh COALESCE để tránh kết quả null
         COALESCE(k.bhyt,0) AS bhyt,-- as IsHI, --thanh bh: 0 không thanh, 1: thanh
         COALESCE(tk.khocp,'') AS khocp, -- as StoreHouseCode, --mã khoa (khocp)
         COALESCE(tk.madv,'') AS madv,-- as CabinetCode, --Mã tủ trực (madv)
         tk.thangkt,-- as sMonth, --Tháng kết toán
         tk.namkt-- as sYear --Năm kế toán
        FROM current.pstonkho tk
            INNER JOIN current.dmthuoc th ON tk.mahh = th.mahh
            INNER JOIN current.dmkho k ON tk.mahh = k.mahh
            INNER JOIN current.dmloaikhoql lk ON th.kho = lk.kho AND lk.kho <> '04' --[ÔNG TRIỆU HẬU 2025-07-14: Thêm các kho khác: '05','06','09' ] ![](https://live.staticflickr.com/65535/54653345774_6b2e64fccd_b.jpg)
                                                                                    --[ÔNG TRIỆU HẬU 2025-07-14]: Chỉ loại trừ 04, VTYT ![](https://staging-jubilee.flickr.com/65535/54660882369_0996f0311b_c.jpg)
        WHERE (COALESCE(p_mahh,'')='' OR tk.mahh = p_mahh)              
              AND tk.thangkt = thangkt_S
              AND tk.namkt = namkt_S
              AND COALESCE(tk.uutien,'') != '2'
              AND (COALESCE(tk.toncuoi,0) - COALESCE(tk.tamxuat,0)) > 0
              --[ÔNG TRIỆU HẬU: 2025-09-15] Xử lý lại các điều kiện để phù hợp với Param truyền vào
              --https://i.dh-his.com/hdhiswork/TOLAPTRINH/issues/23
              AND CASE WHEN p_istutruc = TRUE THEN
                            COALESCE(tk.khocp, '') = '' AND COALESCE(tk.madv, '') = ANY(kho_tutruc)
                       WHEN p_isnhathuoc = TRUE THEN
                            COALESCE(tk.khocp, '') = '13'
                       ELSE --Đã xử lý p_isDongYThanhPham, p_isDongYThuocThang vào biến khocp_dt
                            COALESCE(tk.khocp, '') = COALESCE(khocp_dt, '') 
                  END  
              -- AND (
              --   	  p_istutruc = FALSE AND p_isnhathuoc = FALSE AND COALESCE(tk.khocp, '') = COALESCE(khocp_dt, '')
              --         OR p_istutruc = TRUE AND (COALESCE(tk.khocp, '') = '') AND (COALESCE(tk.madv, '') = ANY(kho_tutruc))		--NQHOA 2025-07-25 : Bổ sung kiểm tra nếu lấy thuốc từ tủ trực sẽ where theo madv
              --         OR p_istutruc = FALSE AND p_isnhathuoc = TRUE AND (COALESCE(tk.khocp, '') = '13')
              -- 	  )	
            	   
        ORDER BY tk.mahh, tk.handung, tk.uutien
  ) AS row_data;
  RETURN result;
END;
$$;



