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
CREATE OR REPLACE FUNCTION badt_dhs.getSyncADM_ByDmbenhnhan(mabn TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result RECORD;
  payload JSONB;
  p_mabn TEXT := lower(mabn);  -- Alias cho biến mabn
  row_count INTEGER := 0;  -- Biến đếm số row được xử lý
BEGIN
  -- 1. Duyệt qua tất cả các bản ghi của mabn
  --[ÔNG TRIỆU HẬU: 2025-10-22]: Bổ sung đẩy lại thông tin ngoại trú 
  --                             mabn,makb,maba,bant, gửi tới psdangky vưới operation: INSERT
  FOR result IN
    -- Lấy từ bnnoitru
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

    -- Lấy từ psdangky (chỉ lấy 1 bản ghi mới nhất) - dùng subquery
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
    -- Tăng biến đếm
    row_count := row_count + 1;
    
    -- 2. Tạo payload dưới dạng JSON cho mỗi bản ghi
    payload := jsonb_build_object(
      'bant', result.bant,
      'maba', result.maba,
      'mabn', result.mabn,
      'makb', result.makb,
      'namvien', result.namvien,
      'operation', 'INSERT',  -- Giả sử là thao tác INSERT
      'channel', result.channel
    );

    -- 3. Gọi pg_notify để gửi dữ liệu đồng bộ cho pgListener cho mỗi bản ghi
    PERFORM pg_notify('badt_dhs', payload::text);

    -- Kiểm tra kết quả từng row
    RAISE NOTICE '[Row %] Đã gửi thông báo đồng bộ [%] với payload: %', row_count, result.channel, payload;
  END LOOP;

  -- 4. Thông báo tổng kết
  IF row_count = 0 THEN
    RAISE NOTICE 'Không tìm thấy dữ liệu nào cho mã bệnh nhân: %', p_mabn;
  ELSE
    RAISE NOTICE '===== Hoàn thành đồng bộ: Đã xử lý % row(s) cho mã bệnh nhân: % =====', row_count, p_mabn;
  END IF;

END;
$$;