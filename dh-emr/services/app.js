const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const express = require('express');
const fs = require('fs');
const {Client} = require('pg');
process.env.TZ = 'UTC+7';
dotenv.config();
const TOKEN_SECRET = process.env.BASE_URL || "jwtdhhis";

const client = new Client({
  host: process.env.PGDATA_HOST,
  user: process.env.PGDATA_USER,
  port: process.env.PGDATA_PORT,
  password: process.env.PGDATA_PASSWORD,
  database: process.env.PGDATA_DATABASE,
})
client.connect();


const app = express();
const port = process.env.PORT || 8032;

app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
app.use(express.json());  

// lấy token
app.post('/api/v1/token', (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  client.query(`SELECT taikhoan 
                FROM current.dmnhanvien 
                WHERE lower(taikhoan) = lower('` + username + `') 
                AND matkhau = md5('` + password + `') `, (err, res1)=>{
                       
    if(res1.rows == ''){
      res.send(JSON.stringify({
        token:null
      }))
      res.end(); 
    }else{
      const data = req.body;
      const accesstoken = jwt.sign(data, TOKEN_SECRET, {expiresIn : '3600s'});
      res.send(JSON.stringify({
        token:accesstoken
      }))
      res.end(); 
    }
   
  })
  client.end;
})

//Load tham số hệ thống
app.post('/AppDH/thamsohethong', (req, res)=>{
  const tents = req.body.tents;
  var sql = ` SELECT st.giatri
              FROM current.system st
              WHERE st.tents = '`+tents+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//------------------------------------------------------ ĐĂNG NHẬP -------------------------------------------------------
//Lấy thông tin bác sĩ
app.post('/AppDH/dangnhap/LoadThongTin', (req, res)=>{
  const taikhoan = req.body.taikhoan;
  var sql = ` SELECT nv.manv, nv.holot, nv.ten, nv.madv, dv.tendv, nv.loai
              FROM current.dmnhanvien nv, current.dmdonvi dv
              WHERE nv.madv = dv.madv
              AND nv.taikhoan = '`+taikhoan+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Đăng nhập
app.post('/AppDH/dangnhap/DangNhapAction', (req, res)=>{
  const taikhoan = req.body.taikhoan;
  const matkhau = req.body.matkhau
  var sql = ` SELECT nv.taikhoan, nv.duockham FROM current.dmnhanvien as nv WHERE nv.taikhoan='`+taikhoan+`'`;
  client.query(sql, (err, res1)=>{
    if(res1 == null){
       res.send('taikhoanerr');
       res.end();
    }else{
      var sql = ` SELECT nv.taikhoan, nv.matkhau 
                  FROM current.dmnhanvien as nv 
                  WHERE nv.taikhoan='`+taikhoan+`' and nv.matkhau='`+matkhau+`'`;
      client.query(sql, (err, res2)=>{
        if (res2.rows == null || res2.rows == '') {
          res.send('error');
          res.end();
        }else{
          res.send('success');
          res.end();
        }
      })
    }
   
  })
})

//Lấy ngày giờ hiện tại
app.get('/AppDH/dangnhap/NgayGioHienTai', (req, res)=>{
  var sql = ` SELECT current_date as ngaygioht `;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Lấy ngày giờ
app.get('/AppDH/dangnhap/NgayGio', (req, res)=>{
  var sql = ` SELECT CURRENT_TIMESTAMP as ngaygioht `;
  client.query(sql, (err, res1)=>{
    let ngay = res1.rows[0]['ngaygioht'].getDate();
    let thang = res1.rows[0]['ngaygioht'].getMonth() + 1;
    let nam = res1.rows[0]['ngaygioht'].getFullYear();
    let gio = res1.rows[0]['ngaygioht'].getHours()+7;
    let phut = res1.rows[0]['ngaygioht'].getMinutes();
    let giay = res1.rows[0]['ngaygioht'].getSeconds();
    const timestamp = [{"ngaygioht": nam+'-'+thang+'-'+ngay+'T'+gio+':'+phut+':'+giay}];
    res.send(timestamp);
    res.end();
  })
})

//------------------------------------------------------- QUÁ TRÌNH ĐIỀU TRỊ ---------------------------------------------
//Lấy ICD Phụ
app.post('/AppDH/qtdieutri/LoadICDP', (req, res)=>{
  const maicd = req.body.maicd;
  var sql = ` SELECT cd.maicd, cd.tenviet
              FROM current.dmicd cd
              WHERE cd.maicd = '`+maicd+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Lấy danh sách ICD
app.post('/AppDH/qtdieutri/LoadDanhSachICD', (req, res)=>{
  var sql = ` SELECT cd.maicd, cd.tenviet
              FROM current.dmicd cd`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra ICD
app.post('/AppDH/qtdieutri/KiemTraICD', (req, res)=>{
  const maicd = req.body.maicd;
  const tenviet = req.body.tenviet;
  var sql = ` SELECT cd.maicd
              FROM current.dmicd cd
              WHERE cd.maicd = '`+maicd+`'
              AND cd.tenviet = '`+tenviet+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Insert kết quả điều trị
app.post('/AppDH/qtdieutri/qtdieutriAction/insert', (req, res)=>{
  const mabn = req.body.mabn;
  const makb = req.body.makb;
  const maba = req.body.maba;
  const manv = req.body.manv;
  const mach = req.body.mach;
  const huyetap = req.body.huyetap;
  const nhiptho = req.body.nhiptho;
  const nhietdo = req.body.nhietdo;
  const cannang = req.body.cannang;
  const dienbien = req.body.dienbien;
  const maicd = req.body.maicd;
  const kqcdoan = req.body.kqcdoan;
  const maicdp = req.body.maicdp;
  const kqcdoanp = req.body.kqcdoanp;
  const madv = req.body.madv;
  const maphong =req.body.maphong;
  const mahsba = req.body.mahsba;
  const maxt = req.body.maxt;
  const sogiuong = req.body.sogiuong;
  const buong = req.body.buong;
  const iddienbien = req.body.iddienbien;
  const chieucao = req.body.chieucao;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  const mayhct = req.body.mayhct;
  const tenyhct = req.body.tenyhct;
  const mapl = req.body.mapl;
  const ghichu = req.body.ghichu;
  const khamcuoi = req.body.khamcuoi;
  const ma_giuong = req.body.ma_giuong;
  const chamsoc = req.body.chamsoc;
  var sql = ` INSERT INTO current.qtdieutri(mabn,makb,maba,manv,ngaygio,mach,huyetap,nhiptho,nhietdo,cannang,dienbien,
                          maicd,kqcdoan,maicdp,kqcdoanp,madv,maphong,mahsba,maxt,sogiuong,buong,iddienbien,chieucao,thangkt,
                          namkt,mayhct,tenyhct,mapl,ghichu,khamcuoi,ma_giuong,chamsoc) 
              VALUES ('`+mabn+`','`+makb+`','`+maba+`','`+manv+`',LOCALTIMESTAMP,`+mach+`,'`+huyetap+`',`+nhiptho+`,
                       `+nhietdo+`,`+cannang+`,'`+dienbien+`','`+maicd+`','`+kqcdoan+`','`+maicdp+`','`+kqcdoanp+`',
                      '`+madv+`','`+maphong+`','`+mahsba+`','`+maxt+`','`+sogiuong+`','`+buong+`','`+iddienbien+`',
                       `+chieucao+`,'`+thangkt+`','`+namkt+`','`+mayhct+`','`+tenyhct+`','`+mapl+`','`+ghichu+`',
                       `+khamcuoi+`,'`+ma_giuong+`','`+chamsoc+`')`;
  client.query(sql, (err, res1)=>{
    if(err == null){
      var sql1 = `UPDATE current.bnnoitru SET ngaykcb = LOCALTIMESTAMP, 
                  buong='`+buong+`',cannang=`+cannang+`,chamsoc='`+chamsoc+`',chieucao=`+chieucao+`,
                  dienbien='`+dienbien+`',ghichu='`+ghichu+`',huyetap='`+huyetap+`',iddienbien='`+iddienbien+`',
                  kqcdoan='`+kqcdoan+`',kqcdoanp='`+kqcdoanp+`',mabn='`+mabn+`',mach=`+mach+`,madv='`+madv+`',
                  mahsba='`+mahsba+`',maicd='`+maicd+`',maicdp='`+maicdp+`',makb='`+makb+`',manv='`+manv+`',
                  mayhct='`+mayhct+`',namkt='`+namkt+`',nhietdo=`+nhietdo+`,
                  nhiptho=`+nhiptho+`,sogiuong='`+sogiuong+`',tenyhct='`+tenyhct+`',thangkt='`+thangkt+`' 
                  WHERE maba='`+maba+`'`;
                  //maphong='`+maphong+`',maxt='`+maxt+`',
       client.query(sql1, (err1, res2)=>{
          if (err1 == null) {
            res.send('success'); 
            res.end();
          }else{
            res.send('error'); 
            res.end();
          }
       })
    }else{
      res.send('error'); 
      res.end();
    }
    
  })
})

//Kiểm tra ICD
app.post('/AppDH/qtdieutri/LichSuDieuTri', (req, res)=>{
  const maba = req.body.maba;
  var sql = ` SELECT dt.iddienbien, CAST(to_char(dt.ngaygio, 'dd/mm/yyyy HH24:MI:ss') as varchar) as ngaygio, dt.dienbien
              FROM current.qtdieutri dt
              WHERE dt.maba = '`+maba+`'
              ORDER BY dt.ngaygio DESC `;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra CLS theo ID
app.post('/AppDH/qtdieutri/LichSuClsTheoID', (req, res)=>{
  const maba = req.body.maba;
  const iddienbien = req.body.iddienbien;
  var sql = ` SELECT DISTINCT CAST(to_char(cls.ngaykcb, 'dd/mm/yyyy HH24:MI:ss') as varchar) as ngaykcb, dm.tencls, cls.macls, cls.dongia, cls.soluong, cls.thanhtien
              FROM current.chidinhcls cls, current.dmcls dm
              WHERE cls.macls = dm.macls
              AND cls.dongia > 0
              AND cls.maba = '`+maba+`'
              AND cls.iddienbien = '`+iddienbien+`'
              AND cls.xoa = 0`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra diễn biến theo ID
app.post('/AppDH/qtdieutri/LoadThongTinDienBienTheoID', (req, res)=>{
  const iddienbien = req.body.iddienbien;
  var sql = ` SELECT dt.maicd, dt.kqcdoan, dt.dienbien, dt.huyetap, dt.nhietdo, dt.mach, dt.nhiptho, dt.chieucao, dt.cannang
              FROM current.qtdieutri dt
              WHERE dt.iddienbien = '`+iddienbien+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra Lịch sử thuốc theo ID
app.post('/AppDH/qtdieutri/LichSuThuocTheoID', (req, res)=>{
  const mabn = req.body.mabn;
  const iddienbien = req.body.iddienbien;
  var sql = ` SELECT DISTINCT CAST(to_char(xn.ngayhd, 'dd/MM/yyyy') as varchar) as ngayhd, xn.mahh, th.tenhh, xn.giaban, xn.soluong, xn.thanhtien
              FROM current.pshdxn xn, current.dmthuoc th
              WHERE xn.mahh = th.mahh
              AND xn.mabn = '`+mabn+`'
              AND xn.iddienbien = '`+iddienbien+`'
              AND xn.xoa = 0`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Update kết quả điều trị
app.post('/AppDH/qtdieutri/qtdieutriAction/update', (req, res)=>{

  const huyetap = req.body.huyetap;
  const nhiptho = req.body.nhiptho;
  const nhietdo = req.body.nhietdo;
  const cannang = req.body.cannang;
  const mach = req.body.mach;
  const chieucao = req.body.chieucao;
  const iddienbien = req.body.iddienbien;
  const dienbien = req.body.dienbien;
  
  var sql = ` UPDATE current.qtdieutri SET huyetap='`+huyetap+`', nhiptho=`+nhiptho+`, nhietdo=`+nhietdo+`, 
              cannang=`+cannang+`, mach=`+mach+`, chieucao = `+chieucao+`, dienbien='`+dienbien+`' 
              WHERE iddienbien='`+iddienbien+`'`;
  client.query(sql, (err, res1)=>{
    if(err == null){
      res.send('success'); 
      res.end();
    }else{
      res.send('error'); 
      res.end();
    }
    
  })
})










//------------------------------------------------------- PSHDXN ---------------------------------------------------------
//Lấy tháng kế toán
app.post('/AppDH/pshdxn/ThangKT', (req, res)=>{
  var sql = ` SELECT s.giatri as thangkt
              FROM current.system as s
              WHERE s.tents = 'thanglv'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra cập nhật diễn biến
app.post('/AppDH/pshdxn/KiemTraCapNhatDienBien', (req, res)=>{
  const ngayht = req.body.ngayht;
  const mabn = req.body.mabn;
  var sql = ` SELECT CAST(to_char(a.ngaykcb, 'dd-mm-yyyy') as varchar) as ngaykcb
              FROM current.bnnoitru a
              WHERE cast(to_char(a.ngaykcb, 'dd/MM/yyyy') as varchar) = '`+ngayht+`'
              AND a.mabn = '`+mabn+`'
              AND a.xoa = 0`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Lấy đối tượng kho CP
app.post('/AppDH/pshdxn/DoiTuongKhoCP', (req, res)=>{
  const madt = req.body.madt;
  var sql = ` SELECT k.khocp
              FROM current.dmdoituongkhocp as k
              WHERE k.noitru = '1'
              AND k.madt = '`+madt+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Danh sách mã bệnh án con
app.post('/AppDH/pshdxn/DsMabaCon', (req, res)=>{
  const mabn = req.body.mabn;
  var sql = ` SELECT tt.maba
              FROM current.ttcon tt
              WHERE tt.mabnme = '`+mabn+`'
              AND tt.loaitt = '0'
              AND tt.xoa = 0`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Danh sách thuốc
app.post('/AppDH/pshdxn/LoadThuoc', (req, res)=>{
  const sohd = req.body.sohd;
  var sql = ` SELECT th.mahh, th.tenhh, th.dvt, xn.soluong, xn.thanhtien, xn.ngayhd, xn.ngaylap, xn.khochan, xn.khole, xn.noitru, xn.madv, xn.iddienbien, xn.maba
              FROM current.dmthuoc th, current.pshdxn xn
              WHERE th.mahh = xn.mahh
              AND xn.xoa = 0
              AND xn.sohd = '`+sohd+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Trả tồn kho
app.post('/AppDH/pshdxn/TraTonKho', (req, res)=>{
  const mahh = req.body.mahh;
  const khocp = req.body.khocp;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  var sql = ` SELECT (lpad(split_part(a.handung, '/', 2), 4, '0')) || lpad(split_part(a.handung, '/', 1), 2, '0') as hd,
                COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0) AS toncuoi,a.handung, a.thangkt, a.namkt, a.khocp, a.tamxuat, a.tondau, a.toncuoi
              FROM current.pstonkho as a 
              WHERE a.mahh = '`+mahh+`'
              AND a.khocp = '`+khocp+`'
              AND a.thangkt = '`+thangkt+`'
              AND a.namkt = '`+namkt+`'
              AND a.tamxuat !=0
              AND a.uutien !='2'
              ORDER BY uutien`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Trả tồn kho
app.post('/AppDH/pshdxn/LoadHanDung', (req, res)=>{
  const mahh = req.body.mahh;
  const khocp = req.body.khocp;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  var sql = ` SELECT a.handung,
              COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0) AS toncuoi, a.giavat, a.solo, a.giaxuat, 
              a.giabhyt, a.tondau,a.uutien
              FROM current.pstonkho as a 
              WHERE a.mahh = '`+mahh+`'
              AND a.thangkt = '`+thangkt+`'
              AND a.namkt = '`+namkt+`'
              AND a.khocp = '`+khocp+`'
              AND a.xoa = 0
              AND a.uutien != '2'
              AND COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0) != 0
              ORDER BY a.uutien`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra tồn cuối
app.post('/AppDH/pshdxn/KiemTraTonCuoi', (req, res)=>{
  const mahh = req.body.mahh;
  const khocp = req.body.khocp;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  var sql = ` SELECT SUM(COALESCE(a.toncuoi, 0)) - SUM(COALESCE(a.tamxuat, 0)) AS tong
              FROM current.pstonkho as a 
              WHERE a.mahh = '`+mahh+`'
              AND a.khocp = '`+khocp+`'
              AND a.thangkt = '`+thangkt+`'
              AND a.namkt = '`+namkt+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Lấy tên thuốc
app.post('/AppDH/pshdxn/LayTenThuoc', (req, res)=>{
  const mahh = req.body.mahh;
  var sql = ` SELECT th.mahh, th.tenhh, th.dvt
              FROM current.dmthuoc th
              WHERE th.mahh = '`+mahh+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Trừ tồn kho
app.post('/AppDH/pshdxn/trutonkho', (req, res)=>{
  const mahh = req.body.mahh;
  const khocp = req.body.khocp;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  var sql = ` SELECT (lpad(split_part(a.handung, '/', 2), 4, '0')) || lpad(split_part(a.handung, '/', 1), 2, '0') as hd,
                 COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0) AS toncuoi,a.handung, a.thangkt, a.namkt, a.khocp, a.tamxuat, a.tondau,
                 a.uutien
              FROM current.pstonkho as a 
              WHERE a.mahh = '`+mahh+`'
              AND a.khocp = '`+khocp+`'
              AND a.thangkt = '`+thangkt+`'
              AND a.namkt = '`+namkt+`'
              AND toncuoi !=0
              AND a.uutien !='2'
              ORDER BY uutien`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra BHYT2
app.post('/AppDH/pshdxn/KiemTraBHYT2', (req, res)=>{
  const mabn = req.body.mabn;
  var sql = ` SELECT tt.maba
              FROM current.ttcon tt
              WHERE tt.mabnme = '`+mabn+`'
              AND tt.loaitt = '1'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra con
app.post('/AppDH/pshdxn/KiemTraCon', (req, res)=>{
  const mabn = req.body.mabn;
  var sql = ` SELECT tt.maba
              FROM current.ttcon tt
              WHERE tt.mabnme = '`+mabn+`'
              AND tt.loaitt = '0'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Thông tin BHYT2
app.post('/AppDH/pshdxn/ThongTinBHYT2', (req, res)=>{
  const mabn = req.body.mabn;
  var sql = ` SELECT tt.maba, tt.manv, tt.maicd, tt.maicdp, tt.dienbien, tt.cannang, tt.kqcdoan, tt.kqcdoanp, tt.chieucao, 
              tt.thangkt, tt.namkt, tt.mayhct, tt.tenyhct, tt.madt, tt.mathe, tt.thang_qt, tt.nam_qt, tt.iddienbien
              FROM current.ttcon tt
              WHERE tt.mabnme = '`+mabn+`'
              AND tt.loaitt = '1'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Thông tin con
app.post('/AppDH/pshdxn/ThongTinCon', (req, res)=>{
  const mabn = req.body.mabn;
  var sql = ` SELECT tt.maba, tt.manv, tt.maicd, tt.maicdp, tt.dienbien, tt.cannang, tt.kqcdoan, tt.kqcdoanp, tt.chieucao, 
              tt.thangkt, tt.namkt, tt.mayhct, tt.tenyhct, tt.madt, tt.mathe, tt.thang_qt, tt.nam_qt, tt.iddienbien
              FROM current.ttcon tt
              WHERE tt.mabnme = '`+mabn+`'
              AND tt.loaitt = '0'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Load thuốc LLTT
app.post('/AppDH/pshdxn/LoadThuocLLTT', (req, res)=>{
  const sohd = req.body.sohd;
  var sql = ` SELECT th.mahh, th.tenhh, th.dvt, sum(xn.soluong) as soluong, sum(xn.thanhtien) as thanhtien
              FROM current.dmthuoc th, current.pshdxn xn
              WHERE th.mahh = xn.mahh
              AND xn.xoa = 0
              AND xn.sohd = '`+sohd+`'
              group by th.mahh`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Load thông tin kho
app.post('/AppDH/pshdxn/LoadThongTinKho', (req, res)=>{
  const madt = req.body.madt;
  var sql = ` SELECT cp.khocp, cp.khocpc, dt.bhyt
              FROM current.dmdoituongkhocp dm, current.dmkhocp cp, current.dmdoituong dt
              WHERE dm.khocp = cp.khocp
              AND dt.madt = dm.madt
              AND dm.noitru = 1
              AND dm.madt = '`+madt+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Load Thông Tin
app.post('/AppDH/pshdxn/LoadThongTin', (req, res)=>{
  const mahh = req.body.mahh;
  var sql = ` SELECT kh.bhyt, kh.gianhap, kh.giavat, kh.quidoi, kh.ptcong, kh.giaxuat
              FROM current.dmthuoc th, current.dmkho kh
              WHERE th.mahh = kh.mahh
              AND th.mahh = '`+mahh+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Delete một thuốc
app.post('/AppDH/pshdxn/pshdxnAction/delete1thuoc', (req, res)=>{
  const sohd = req.body.sohd;
  const mahh = req.body.mahh;
  var sql = ` UPDATE current.pshdxn SET xoa=1,ngayxoa = LOCALTIMESTAMP WHERE sohd = '`+sohd+`' AND mahh = '`+mahh+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Load Thuốc xóa
app.post('/AppDH/pshdxn/LoadThuocXoa', (req, res)=>{
  const sohd = req.body.sohd;
  const mahh = req.body.mahh;
  var sql = ` SELECT xn.mahh, sum(xn.soluong) as soluong
              FROM current.pshdxn xn
              WHERE xn.xoa = 0
              AND xn.sohd = '`+sohd+`'
              AND xn.mahh = '`+mahh+`'
              Group by xn.mahh`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Load hạng dùng
app.post('/AppDH/pshdxn/LoadHanDung', (req, res)=>{
  const mahh = req.body.mahh;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  const khocp = req.body.khocp;
  var sql = ` SELECT a.handung, COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0) AS toncuoi, a.giavat, a.solo, a.giaxuat, a.giabhyt, a.tondau
              FROM current.pstonkho as a 
              WHERE a.mahh = '`+mahh+`'
              AND a.thangkt = '`+thangkt+`'
              AND a.namkt = '`+namkt+`'
              AND a.khocp = '`+khocp+`'
              AND a.xoa = 0
              AND a.uutien != '2'
              AND COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0) != 0
              ORDER BY a.uutien`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Kiểm tra tổng tồn kho
app.post('/AppDH/pshdxn/KiemTraTongTonKho', (req, res)=>{
  const mahh = req.body.mahh;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  const khocp = req.body.khocp;
  var sql = ` SELECT a.mahh, sum(COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0)) as toncuoi
              FROM current.pstonkho as a 
              WHERE a.mahh = '`+mahh+`'
              AND a.thangkt = '`+thangkt+`'
              AND a.namkt = '`+namkt+`'
              AND a.khocp = '`+khocp+`'
              AND a.xoa = 0
              AND a.uutien != '2'
              AND COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0) != 0
              group BY a.mahh`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Thêm thuốc
app.post('/AppDH/pshdxn/pshdxnAction/insert', (req, res)=>{
  var date = new Date();
  var today = date.getDate()+'-'+(date.getMonth()+1)+'-'+date.getFullYear();
  var time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
  var sohd = req.body.sohd;
  var ngayhd = req.body.ngayhd;if(ngayhd == ''){ngayhd = today+" "+time}
  var ngaylap = req.body.ngaylap;if(ngaylap == ''){ngaylap = today}
  var loaixm = req.body.loaixm;
  var madt = req.body.madt;
  var mabn = req.body.mabn;
  var makh = req.body.makh;
  var khochan = req.body.khochan;
  var khole = req.body.khole;
  var noitru = req.body.noitru;if(noitru == null || noitru == ''){  noitru = 1; }
  var madv = req.body.madv;
  var mp;
  var maphong = req.body.maphong;if(maphong == '' || maphong == 'null'){maphong = null;mp = null;}else{mp='\''+maphong+'\'';}
  var mahh = req.body.mahh;
  var gianhap = req.body.gianhap;
  var quidoi = req.body.quidoi;
  var vat = req.body.vat;if(vat == ''){  vat = null; }
  var giavat = req.body.giavat;
  var ptcong = req.body.ptcong;if(ptcong == null || ptcong == ''){  ptcong = 0; }
  var giaban = req.body.giaban;
  var ck = req.body.ck;if(ck == ''){  ck = null; }
  var solo = req.body.solo;
  var handung = req.body.handung;if(handung == 'null' ){  handung = ''; }
  var visa = req.body.visa;
  var soluong = req.body.soluong;
  var theodon = req.body.theodon;
  var tientvat = req.body.tientvat;
  var tienvat = req.body.tienvat;
  var tienck = req.body.tienck; if(tienck == ''){  tienck = null; }
  var thanhtien = req.body.thanhtien;
  var taikhoan = req.body.taikhoan;
  var tenmay = req.body.tenmay;
  var cachuong = req.body.cachuong;
  var soctvp = req.body.soctvp;
  var soctvphd = req.body.soctvphd;
  var thangkt = req.body.thangkt;
  var namkt = req.body.namkt;
  var khoaso = req.body.khoaso;if(khoaso == ''){  khoaso = null; }
  var thu = req.body.thu;if(thu == ''){  thu = null; }
  var loaitoa = req.body.loaitoa;if(loaitoa == null || loaitoa == ''){loaitoa = 1;}
  var userin = req.body.userin;
  var mathe = req.body.mathe;
  var tutruc = req.body.tutruc;
  var toatutruc = req.body.toatutruc;if(toatutruc == null || toatutruc == ''){toatutruc = 0;}
  var stt = req.body.stt;if(stt == ''){stt = null;}
  var sang = req.body.sang;if(sang == ''){sang = null;}
  var trua = req.body.trua;if(trua == ''){trua = null;}
  var chieu = req.body.chieu;if(chieu == ''){chieu = null;}
  var toi = req.body.toi;if(toi == ''){toi = null;}
  var iddienbien = req.body.iddienbien;
  var kyhieu = req.body.kyhieu;
  var nhanct = req.body.nhanct;if(nhanct == ''){nhanct = null;}
  var dain = req.body.dain;if(dain == ''){dain = null;}
  var giolap = req.body.giolap;if(giolap == ''){giolap = today+" "+time}
  var tamin = req.body.tamin;if(tamin == ''){tamin = null;}
  var intoadieutri = req.body.intoadieutri;if(intoadieutri == ''){intoadieutri = null;}
  var travedieutri = req.body.travedieutri;if(travedieutri == ''){travedieutri = null;}
  var toaxv = req.body.toaxv;if(toaxv == ''){toaxv = null;}
  var toacon = req.body.toacon;
  var macon = req.body.macon;
  var giabhyt = req.body.giabhyt;if(giabhyt == ''){giabhyt = null;}
  var giakc = req.body.giakc;if(giakc == ''){giakc = null;}
  var thanhtienbhyt = req.body.thanhtienbhyt;if(thanhtienbhyt == ''){thanhtienbhyt = null;}
  var soctnb = req.body.soctnb;
  var bhyt = req.body.bhyt;if(bhyt == ''){bhyt = null;}
  var thuock = req.body.thuock;if(thuock == ''){thuock = null;}
  var inmaubhyt = req.body.inmaubhyt;if(inmaubhyt == ''){inmaubhyt = null;}
  var dutru = req.body.dutru;if(dutru == ''){dutru = null;}
  var ngayin = req.body.ngayin;
  var ttchinhtoa = req.body.ttchinhtoa;if(ttchinhtoa == ''){ttchinhtoa = null;}
  var sohdnb = req.body.sohdnb;
  var muangoai = req.body.muangoai;if(muangoai == ''){muangoai = null;}
  var manguon = req.body.manguon;
  var solanin = req.body.solanin;if(solanin == ''){solanin = null;}
  var tamkhoa = req.body.tamkhoa;if(tamkhoa == ''){tamkhoa = null;}
  var thanhtoan = req.body.thanhtoan;
  var bant = req.body.bant;if(bant == ''){bant = null;}
  var maba = req.body.maba;
  var ngayth_khoa = req.body.ngayth_khoa;
  var ptbanle = req.body.ptbanle;if(ptbanle == ''){ptbanle = null;}
  var thang_qt = req.body.thang_qt;
  var nam_qt = req.body.nam_qt;
  var loaixn = req.body.loaixn;
  var bant = req.body.bant;if (bant == '') {bant = null}
  var sql = ` INSERT INTO current.pshdxn(sohd,ngayhd,ngaylap,loaixn,madt,mabn,makh,khochan,khole,noitru,madv,maphong,
                mahh,gianhap,quidoi,vat,giavat,ptcong,giaban,ck,solo,handung,visa,soluong,theodon,tientvat,tienvat,tienck,
                thanhtien,taikhoan,tenmay,cachuong,soctvp,thangkt,namkt,khoaso,thu,loaitoa,userin,mathe,tutruc,
                toatutruc,stt,sang,trua,chieu,toi,iddienbien,kyhieu,nhanct,dain,giolap,tamin,intoadieutri,travedieutri,
                toaxv,toacon,macon,giabhyt,giakc,thanhtienbhyt,soctnb,bhyt,thuock,inmaubhyt,dutru,ttchinhtoa,sohdnb,
                muangoai,manguon,solanin,tamkhoa,thanhtoan,soctvphd,bant,maba,ptbanle,thang_qt,nam_qt) 
              VALUES ('`+sohd+`',TO_DATE('`+ngayhd+`', 'dd/MM/yyyy'),TO_DATE('`+ngaylap+`', 'dd/MM/yyyy'),
                '`+loaixn+`','`+madt+`','`+mabn+`','`+makh+`','`+khochan+`',
                '`+khole+`',`+noitru+`,'`+madv+`',`+mp+`,'`+mahh+`','`+gianhap+`','`+quidoi+`',`+vat+`,`+giavat+`,
                '`+ptcong+`',`+giaban+`,`+ck+`,'`+solo+`','`+handung+`','`+visa+`',`+soluong+`,`+theodon+`,'`+tientvat+`',
                `+tienvat+`,`+tienck+`,`+thanhtien+`,'`+taikhoan+`','`+tenmay+`','`+cachuong+`','`+soctvp+`',
                '`+thangkt+`','`+namkt+`',`+khoaso+`,`+thu+`,`+loaitoa+`,'`+userin+`','`+mathe+`',
                '`+tutruc+`',`+toatutruc+`,`+stt+`,`+sang+`,`+trua+`,`+chieu+`,`+toi+`,'`+iddienbien+`',
                '`+kyhieu+`',`+nhanct+`,`+dain+`,TO_TIMESTAMP('`+giolap+`', 'dd-mm-yyyy HH24:MI:ss'),`+tamin+`,`+intoadieutri+`,`+travedieutri+`,`+toaxv+`,
                 `+toacon+`,'`+macon+`',`+giabhyt+`,`+giakc+`,`+thanhtienbhyt+`,'`+soctnb+`',`+bhyt+`,`+thuock+`,`+inmaubhyt+`,
                 `+dutru+`,`+ttchinhtoa+`,'`+sohdnb+`',`+muangoai+`,'`+manguon+`',`+solanin+`,`+tamkhoa+`,
                '`+thanhtoan+`','`+soctvphd+`',`+bant+`,'`+maba+`',`+ptbanle+`,'`+thang_qt+`','`+nam_qt+`')`;
  client.query(sql, (err, res1)=>{
    if (err == null) {
      res.send('success');
      res.end();
    }else{
      res.send('error');
      res.end();
    }
    
  })
})

//Lưu thuốc
app.post('/AppDH/pshdxn/pshdxnAction/save', (req, res)=>{
  var date = new Date();
  var today = date.getDate()+'-'+(date.getMonth()+1)+'-'+date.getFullYear();
   var time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
  var sohd = req.body.sohd;
  var ngayhd = req.body.ngayhd;if(ngayhd == ''){ngayhd = today+" "+time}
  var ngaylap = req.body.ngaylap;if(ngaylap == ''){ngaylap = today}
  var loaixn = req.body.loaixn;
  var kyhieu = req.body.kyhieu;
  var thanhtoan = req.body.thanhtoan;
  var mabn = req.body.mabn;
  var makh = req.body.makh;
  var madt = req.body.madt;
  var manv = req.body.manv;
  var madv = req.body.madv;
  var mp;
  var maphong = req.body.maphong;if(maphong == '' || maphong == 'null'){maphong = null;mp = null;}else{mp='\''+maphong+'\'';}
  var noitru = req.body.noitru;
  if(noitru == null || noitru == ''){
    noitru = 1;
  }
  var khochan = req.body.khochan;
  var khole = req.body.khole;
  var tientvat = req.body.tientvat;if(tientvat == ''){tientvat = null}
  var tienvat = req.body.tienvat;
  var tienck = req.body.tienck;if(tienck == ''){tienck = null}
  var thanhtien = req.body.thanhtien;if(thanhtien == null || thanhtien == ''){thanhtien = 0}//1
  var ngayuong = req.body.ngayuong;if(ngayuong == null || ngayuong == ''){ngayuong = 1}//1
  var dathu = req.body.dathu;if(dathu == null || dathu == ''){dathu = 0;}//1
  var dain = req.body.dain;if(dain == null || dain == ''){dain = 0;}//1
  var chedoan = req.body.chedoan;
  var sinhhoat = req.body.sinhhoat;
  var boan = req.body.boan;if(boan == ''){boan = null}
  var benhnang = req.body.benhnang;if(benhnang == ''){benhnang = null}
  var tresot = req.body.tresot;if(tresot == ''){tresot = null}
  var thobt = req.body.thobt;if(thobt == ''){thobt = null}
  var phancm = req.body.phancm;if(phancm == ''){phancm = null}
  var trekhat = req.body.trekhat;if(trekhat == ''){trekhat = null}
  var ghichu = req.body.ghichu;
  var maicd = req.body.maicd;
  var kqcdoan = req.body.kqcdoan;
  var maicdp = req.body.maicdp;
  var kqcdoanp = req.body.kqcdoanp;
  var nhanct = req.body.nhanct;if(nhanct == null || nhanct == ''){nhanct = 0;}//1
  var taikhoan = req.body.taikhoan;
  var tenmay = req.body.tenmay;
  var xoa = req.body.xoa;if(xoa == null || xoa == ''){xoa = 0;}//1
  //var ngayxoa = req.body.ngayxoa;if(ngayxoa == ''){ngayxoa = null}
  var thangkt = req.body.thangkt;
  var namkt = req.body.namkt;
  var taikham = req.body.taikham;
  var soctnb = req.body.soctnb;
  var loaitoa = req.body.loaitoa;if(loaitoa == null || loaitoa == ''){loaitoa = 1;}//1
  var solanin = req.body.solanin;if(solanin == null || solanin == ''){solanin = 0;}//1
  var userin = req.body.userin;
  var tenkhbl = req.body.tenkhbl;
  var gioitinhbl = req.body.gioitinhbl;if(gioitinhbl == null || gioitinhbl == ''){gioitinhbl = 0;}//1
  var tuoibl = req.body.tuoibl;if(tuoibl == null || tuoibl == ''){tuoibl = 0;}//1
  var dvttuoibl = req.body.dvttuoibl;if(dvttuoibl == null || dvttuoibl == ''){dvttuoibl = 1;}//1
  var ngaysinhbl = req.body.ngaysinhbl;
  var diachibl = req.body.diachibl;
  var tenbsbl = req.body.tenbsbl;
  var dondathang = req.body.dondathang;
  var tutruc = req.body.tutruc;
  var toatutruc = req.body.toatutruc;if(toatutruc == null || toatutruc == ''){toatutruc = 0;}//1
  var mathe = req.body.mathe;
  var ngayth = req.body.ngayth;if(ngayth == null){ngayth = today;}//1
  var iddienbien = req.body.iddienbien;
  var kho = req.body.kho;
  var giolap = req.body.giolap;if(giolap == ''){giolap = today}
  var vat = req.body.vat;if(vat == ''){vat = null}
  var tamin = req.body.tamin;if(tamin == null || tamin == ''){tamin = 0;}//1
  var intoadieutri = req.body.intoadieutri;if(intoadieutri == null || intoadieutri == ''){intoadieutri = 0;}//1
  var travedieutri = req.body.travedieutri;if(travedieutri == null || travedieutri == ''){travedieutri = 0;}//1
  var hinhthucck = req.body.hinhthucck;if(hinhthucck == null || hinhthucck == ''){hinhthucck = 0;}//1
  var phantramck = req.body.phantramck;if(phantramck == ''){phantramck = null}
  var toaxv = req.body.toaxv;if(toaxv == null || toaxv == ''){toaxv = 0;}//1  
  var toacon = req.body.toacon;if(toacon == null || toacon == ''){toacon = 0;}//1
  var macon = req.body.macon;
  var thanhtienbhyt = req.body.thanhtienbhyt;if(thanhtienbhyt == ''){thanhtienbhyt = null}
  var sohdx = req.body.sohdx;
  var tratoa = req.body.tratoa;if(tratoa == null || tratoa == ''){tratoa = 0;}//1
  var thanhtientt = req.body.thanhtientt;if(thanhtientt == ''){thanhtientt = null}
  var inmaubhyt = req.body.inmaubhyt;if(inmaubhyt == null || inmaubhyt == ''){inmaubhyt = 0;}//1
  //var ngayin = req.body.ngayin;
  var ttchinhtoa = req.body.ttchinhtoa;if(ttchinhtoa == null || ttchinhtoa == ''){ttchinhtoa = 0;}//1
  var sohdnb = req.body.sohdnb;
  var muangoai = req.body.muangoai;if(muangoai == null || muangoai == ''){muangoai = 0;}//1
  var macls = req.body.macls;
  var manguon = req.body.manguon;
  var idchidinh = req.body.idchidinh;
  var tamkhoa = req.body.tamkhoa;if(tamkhoa == null || tamkhoa == ''){tamkhoa = 0;}//1
  var ghino = req.body.ghino;if(ghino == ''){ghino = null}
  var bant = req.body.bant;if(bant == null || bant == ''){bant = 0;}//1
  var maba = req.body.maba;
  var ngayth_khoa = req.body.ngayth_khoa;if(ngayth_khoa == ''){ngayth_khoa = today}
  var datra = req.body.datra;if(datra == ''){datra = null}
  var dacopy = req.body.dacopy;if(dacopy == ''){dacopy = null}
  var ptbanle = req.body.ptbanle;if(ptbanle == ''){ptbanle = null}
  var chungtukemtheo = req.body.chungtukemtheo;
  var ngayuongn = req.body.ngayuongn;if(ngayuongn == ''){ngayuongn = null}
  var ngayuongh = req.body.ngayuongh;if(ngayuongh == ''){ngayuongh = null}
  var thang_qt = req.body.thang_qt;
  var nam_qt = req.body.nam_qt;
  var mayhct = req.body.mayhct;
  var tenyhct = req.body.tenyhct;
  
  var sql = ` INSERT INTO   current.chungtu(sohd,ngayhd,ngaylap,loaixn,kyhieu,thanhtoan,mabn,makh,madt,manv,madv,
                 maphong,noitru,khochan,khole,tientvat,tienvat,tienck,thanhtien,ngayuong,dathu,dain,chedoan,sinhhoat,
                 boan,benhnang,tresot,thobt,phancm,trekhat,ghichu,maicd,kqcdoan,maicdp,kqcdoanp,nhanct,
                 taikhoan,tenmay,xoa,thangkt,namkt,taikham,soctnb,loaitoa,solanin,userin,tenkhbl,gioitinhbl,
                 tuoibl,dvttuoibl,diachibl,tenbsbl,dondathang,tutruc,toatutruc,mathe,iddienbien,kho,
                 giolap,vat,tamin,intoadieutri,travedieutri,hinhthucck,phantramck,toaxv,toacon,macon,thanhtienbhyt,
                 sohdx,tratoa,thanhtientt,inmaubhyt,ttchinhtoa,sohdnb,muangoai,macls,manguon,idchidinh,tamkhoa,
                 ghino,bant,maba,ngayth_khoa,datra,dacopy,ptbanle,chungtukemtheo,ngayuongn,ngayuongh,thang_qt,nam_qt,
                 mayhct,tenyhct) VALUES ('`+sohd+`',TO_DATE('`+ngayhd+`', 'dd/MM/yyyy'),
                 TO_DATE('` + ngaylap + `','dd/MM/yyyy'),'`+loaixn+`','`+kyhieu+`','`+thanhtoan+`',
                 '`+mabn+`','`+makh+`','`+madt+`','`+manv+`','`+madv+`',`+mp+`,`+noitru+`,'`+khochan+`','`+khole+`',
                 `+tientvat+`,'`+tienvat+`',`+tienck+`,`+thanhtien+`,`+ngayuong+`,`+dathu+`,`+dain+`,'`+chedoan+`',
                 '`+sinhhoat+`',`+boan+`,`+benhnang+`,`+tresot+`,`+thobt+`,`+phancm+`,`+trekhat+`,
                 '`+ghichu+`','`+maicd+`','`+kqcdoan+`','`+maicdp+`','`+kqcdoanp+`',`+nhanct+`,
                 '`+taikhoan+`','`+tenmay+`',`+xoa+`,'`+thangkt+`','`+namkt+`','`+taikham+`',
                 '`+soctnb+`',`+loaitoa+`,`+solanin+`,'`+userin+`','`+tenkhbl+`',`+gioitinhbl+`,`+tuoibl+`,`+dvttuoibl+`,
                 '`+diachibl+`','`+tenbsbl+`','`+dondathang+`','`+tutruc+`',`+toatutruc+`,'`+mathe+`',
                 '`+iddienbien+`','`+kho+`',TO_DATE('`+giolap+`','dd/MM/yyyy'),`+vat+`,`+tamin+`,`+intoadieutri+`,
                 `+travedieutri+`,`+hinhthucck+`,`+phantramck+`,`+toaxv+`,`+toacon+`,'`+macon+`',`+thanhtienbhyt+`,
                 '`+sohdx+`',`+tratoa+`,`+thanhtientt+`,`+inmaubhyt+`,`+ttchinhtoa+`,'`+sohdnb+`',
                 `+muangoai+`,'`+macls+`','`+manguon+`','`+idchidinh+`',`+tamkhoa+`,`+ghino+`,`+bant+`,'`+maba+`',
                 TO_DATE('`+ngayth_khoa+`','dd/MM/yyyy'),`+datra+`,`+dacopy+`,`+ptbanle+`,'`+chungtukemtheo+`',`+ngayuongn+`,
                 `+ngayuongh+`,'`+thang_qt+`','`+nam_qt+`','`+mayhct+`','`+tenyhct+`')`;
  client.query(sql, (err, res1)=>{
    if (err == null) {
      res.send('success');
      res.end();
    }else{
      res.send('error');
      res.end();
    }
    
  })
})

//Cập nhật tạm xuất
app.post('/AppDH/pshdxn/pshdxnAction/tonkho', (req, res)=>{
  const tamxuat = req.body.tamxuat;
  const mahh = req.body.mahh;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  const khocp = req.body.khocp;
  const handung = req.body.handung;
  const tondau = req.body.tondau;
  const toncuoi = req.body.toncuoi;
  if (handung == '' || handung == null || handung == 0) {
    var sql = ` UPDATE current.pstonkho SET tamxuat=tamxuat+`+tamxuat+` 
                WHERE mahh='`+mahh+`' 
                AND thangkt='`+thangkt+`' 
                AND namkt='`+namkt+`' 
                AND tondau='`+tondau+`' 
                AND khocp='`+khocp+`'`;
    client.query(sql, (err, res1)=>{
      if(err == null){
        res.send('success');
        res.end();
      }else{
        res.send('error');
        res.end();
      }
    })
  }else{
    var sql = ` UPDATE current.pstonkho SET tamxuat=tamxuat+`+tamxuat+` 
                WHERE mahh='`+mahh+`' 
                AND thangkt='`+thangkt+`' 
                AND namkt='`+namkt+`' 
                AND handung='`+handung+`' 
                AND tondau='`+tondau+`' 
                AND khocp='`+khocp+`'`;
    client.query(sql, (err, res1)=>{
      if(err == null){
        res.send('success');
        res.end();
      }else{
        res.send('error');
        res.end();
      }
    })
  }

})

//Delete toa thuốc
app.post('/AppDH/pshdxn/pshdxnAction/delete', (req, res)=>{
  const sohd = req.body.sohd;
  var sql = ` UPDATE current.pshdxn SET xoa=1,ngayxoa = LOCALTIMESTAMP WHERE sohd = '`+sohd+`'`;
    client.query(sql, (err, res1)=>{
      if(err == null){
        var sql = ` UPDATE current.chungtu SET xoa=1,ngayxoa = LOCALTIMESTAMP WHERE sohd = '`+sohd+`'`;
        client.query(sql, (err2, res2)=>{
          if(err2 == null){
            res.send('success');
            res.end();
          }else{
            res.send('error');
            res.end();
          }
        })
      }else{
        res.send('error');
        res.end();
      }
  })
})

//Delete chứng từ
app.post('/AppDH/pshdxn/pshdxnAction/deletechungtu', (req, res)=>{
  const sohd = req.body.sohd;
  var sql = ` UPDATE current.chungtu SET xoa=1,ngayxoa = LOCALTIMESTAMP WHERE sohd = '`+sohd+`'`;
    client.query(sql, (err, res1)=>{
      if(err == null){
        res.send('success');
        res.end();
      }else{
        res.send('error');
        res.end();
      }
  })
})


//Trả tồn kho
app.post('/AppDH/pshdxn/pshdxnAction/tratonkho', (req, res)=>{
  const tamxuat = req.body.tamxuat;
  const mahh = req.body.mahh;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  const khocp = req.body.khocp;
  const handung = req.body.handung;
  const tondau = req.body.tondau;
   if (handung == '' || handung == null || handung == 0) {
        var sql = ` UPDATE current.pstonkho SET tamxuat=tamxuat-`+tamxuat+` 
                    WHERE mahh='`+mahh+`' 
                    AND thangkt='`+thangkt+`' 
                    AND namkt='`+namkt+`' 
                    AND tondau='`+tondau+`' 
                    AND khocp='`+khocp+`'`;
        client.query(sql, (err, res1)=>{
          res.send(res1.rows);
          res.end();
        })
   }else{
        var sql = ` UPDATE current.pstonkho SET tamxuat=tamxuat-`+tamxuat+` 
                    WHERE mahh='`+mahh+`' 
                    AND thangkt='`+thangkt+`' 
                    AND namkt='`+namkt+`' 
                    AND handung='`+handung+`' 
                    AND tondau='`+tondau+`' 
                    AND khocp='`+khocp+`'`;
                    client.query(sql, (err, res1)=>{
          res.send(res1.rows);
          res.end();
        })
   }

})

//Kiểm tra số lượng LLTT
app.post('/AppDH/pshdxn/KiemTraSoLuongLLTT', (req, res)=>{
  const mahh = req.body.mahh;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;
  const khocp = req.body.khocp;

  var sql = ` SELECT a.mahh, sum( COALESCE(a.toncuoi, 0) - COALESCE(a.tamxuat, 0)) AS toncuoi
              FROM current.pstonkho as a 
              WHERE a.mahh = '`+mahh+`'
              AND a.thangkt = '`+thangkt+`'
              AND a.namkt = '`+namkt+`'
              AND a.khocp = '`+khocp+`'
              AND a.xoa = 0
              AND a.uutien != '2'
              group by a.mahh`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Load Mã thẻ theo toa con
app.post('/AppDH/pshdxn/LoadMaThevsToaCon', (req, res)=>{
  const sohd = req.body.sohd;

  var sql = ` SELECT ps.mathe, ps.toacon, ps.macon
              FROM current.pshdxn ps
              WHERE ps.sohd = '`+sohd+`'
              group by ps.mathe, ps.toacon, ps.macon`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Load cach dung
app.post('/AppDH/pshdxn/cachdung', (req, res)=>{
  const manv = req.body.manv;

  var sql = ` SELECT cachuong
              FROM current.dmchidinh
              WHERE manv = '`+manv+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Tìm Kiếm thuốc theo tên
app.post('/AppDH/pshdxn/TimKiemThuocTheoTen', (req, res)=>{
  const madt = req.body.madt;
  const thangkt = req.body.thangkt;
  const namkt = req.body.namkt;

  var sql = ` SELECT DISTINCT th.mahh, th.tenhh
              FROM current.dmthuoc th, current.pstonkho ps, current.dmdoituongkhocp cp
              WHERE ps.mahh = th.mahh
              AND ps.khocp = cp.khocp
              ANd cp.noitru = 1
              AND cp.madt = '`+madt+`'
              AND ps.thangkt = '`+thangkt+`'
              AND ps.namkt = '`+namkt+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Load mã hàng hóa trừ tồn kho
app.post('/AppDH/pshdxn/LoadMahhTruTonKho', (req, res)=>{
  const sohd = req.body.sohd;

  var sql = ` SELECT th.mahh, sum(xn.soluong) as soluong
              FROM current.dmthuoc th, current.pshdxn xn
              WHERE th.mahh = xn.mahh
              AND xn.xoa = 0
              AND xn.sohd = '`+sohd+`'
                group by th.mahh`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Load thuốc đã thêm theo mã bệnh nhân
app.post('/AppDH/pshdxn/LoadThuocDaThemTheoMabn', (req, res)=>{
  const mabn = req.body.mabn;
  const macon = req.body.macon;
  var sql = ` SELECT ct.sohd, CAST(to_char(ct.ngayhd, 'dd-MM-yyyy') as varchar) as ngayhd, ct.taikhoan, ct.dain, ct.ttchinhtoa, ct.macon
              FROM current.chungtu ct
              WHERE ct.mabn = '`+mabn+`'
              AND ct.xoa = 0
              AND ct.macon = '`+macon+`'
              ORDER BY ct.ngayhd DESC`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra chỉnh toa
app.post('/AppDH/pshdxn/ktchinhtoa', (req, res)=>{
  const mabn = req.body.mabn;
  const sohd = req.body.sohd;
  var sql = ` SELECT ct.ttchinhtoa
              FROM current.chungtu ct
              WHERE ct.mabn = '`+mabn+`'
              AND ct.xoa = 0
              AND ct.sohd = '`+sohd+`'
              ORDER BY ct.ngayhd DESC`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Load thuốc theo số hóa đơn
app.post('/AppDH/pshdxn/LoadThuocTheoSohd', (req, res)=>{
  const sohd = req.body.sohd;
  var sql = ` SELECT th.mahh, th.tenhh, xn.soluong, xn.thanhtien
              FROM current.dmthuoc th, current.pshdxn xn
              WHERE th.mahh = xn.mahh
              AND xn.xoa = 0
              AND xn.sohd = '`+sohd+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Tổng tiền thuốc theo số hóa đơn
app.post('/AppDH/pshdxn/TongTienThuocTheoSohd', (req, res)=>{
  const sohd = req.body.sohd;
  var sql = ` SELECT SUM(ct.thanhtien)
              FROM current.pshdxn ct
              WHERE ct.sohd = '`+sohd+`'
              AND ct.xoa = 0`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Update thành tiền của chứng từ theo số hóa đơn
app.post('/AppDH/pshdxn/pshdxnAction/chungtuud', (req, res)=>{
  const sohd = req.body.sohd;
  const thanhtien = req.body.thanhtien;
  const tienvat = req.body.thanhtien;
  var sql = ` UPDATE current.chungtu SET thanhtien='`+thanhtien+`', tienvat='`+tienvat+`' WHERE sohd = '`+sohd+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})







//------------------------------------------------------- BỆNH NHÂN ------------------------------------------------------
//Lấy danh sách bệnh nhân chưa khám
app.get('/AppDH/benhnhan/DanhSachBenhNhanChuaKham/:madv', (req, res)=>{
  const madv = req.params.madv;
  var sql = ` SELECT DISTINCT bn.mabn, bn.holot, bn.ten, CAST(to_char(bn.ngaysinh, 'dd-MM-yyyy') as varchar) as ngaysinh  , bn.gioitinh, dt.maba, bn.diachi
              FROM current.dmbenhnhan bn, current.bnnoitru nt, current.qtdieutri dt
              WHERE bn.mabn = nt.mabn
              AND nt.ravien = 0
              AND nt.namvien = 1
              AND nt.madv = dt.madv
              AND dt.mabn = bn.mabn
              AND dt.maba = nt.maba
              AND bn.xoa = 0
              AND nt.xoa = 0
              AND nt.madv = '`+madv+`'`;
  client.query(sql, (err, res1)=>{
    if(res1.rows == null || res1.rows == ''){
      res.send('null');
      res.end();
    }else{
      res.send(res1.rows);
      res.end();
    }
   
  })
})

//Lấy danh sách bệnh nhân theo mã bệnh án
app.get('/AppDH/benhnhan/TimKiemTheoMaBenhAn/:maba', (req, res)=>{
  const maba = req.params.maba;
  var sql = ` SELECT DISTINCT bn.mabn, bn.holot, bn.ten, CAST(to_char(bn.ngaysinh, 'dd-MM-yyyy') as varchar) as ngaysinh , bn.gioitinh, dt.maba, bn.diachi
              FROM current.dmbenhnhan bn, current.bnnoitru nt, current.qtdieutri dt
              WHERE bn.mabn = nt.mabn
              AND nt.ravien = 0
              AND nt.namvien = 1
              AND nt.madv = dt.madv
              AND dt.mabn = bn.mabn
              AND dt.maba = nt.maba
              AND bn.xoa = 0
              AND nt.xoa = 0
              AND dt.maba LIKE '%`+maba+`%'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Lấy thông tin bệnh nhân
app.get('/AppDH/benhnhan/ThongTinBenhNhan/:maba', (req, res)=>{
  const maba = req.params.maba;
  var sql = ` SELECT nt.maba, nt.manv, nt.mach, nt.maicd, nt.maicdp, nt.madv, nt.maphong, nt.maxt, nt.mabn, bn.holot, nt.ghichu,
                     bn.ten, CAST(to_char(bn.ngaysinh, 'dd-MM-yyyy') as varchar) as ngaysinh, bn.gioitinh,bn.diachi,bn.dienthoai, bn.cmnd, nt.makb, nt.dienbien, nt.huyetap,
                     nt.nhiptho, nt.nhietdo, nt.cannang, nt.kqcdoan, nt.kqcdoanp, nt.sogiuong, nt.chieucao, nt.thangkt, 
                     nt.namkt, nt.mayhct, nt.tenyhct, nt.mahsba, nt.maphong as buong, CAST(to_char(nt.ngayvv, 'HH:mm:ss dd-MM-yyyy') as varchar) as ngayvv , nt.madt, CAST(to_char(nt.ngaykcb, 'dd-MM-yyyy') as varchar) as ngaykcb,
                     nt.mathe,nt.manoigt,nt.bant,nt.thang_qt,nt.travedieutri,nt.nam_qt,nt.iddienbien,dv.tendv,nt.chamsoc, dt.cothe
              FROM  current.bnnoitru nt, current.dmbenhnhan bn, current.dmdonvi dv, current.dmdoituong dt
              WHERE bn.xoa = 0
              AND nt.mabn = bn.mabn
              AND dv.madv = nt.madv
              AND nt.madt = dt.madt
              AND nt.maba = '`+maba+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})



//------------------------------------------------------- ĐƠN VỊ ---------------------------------------------------------

//Lấy danh sách đơn vị
app.get('/AppDH/dmdonvi/Loadmadv', (req, res)=>{
  var sql = ` SELECT DISTINCT dv.madv ,dv.tendv 
              FROM current.dmdonvi dv
              where dv.xoa = 0
              and dv.loaidv = 1
              and dv.dieutri = '1'
              ORDER BY dv.madv `;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//------------------------------------------------------- CẬN LÂM SÀNG -------------------------------------------


//Thêm CLS
app.post('/AppDH/chidinhcls/chidinhclsAction/insert', (req, res)=>{
  var bant = req.body.bant; if(bant == '' || bant == null){bant = 0;}
  var bhyt = req.body.bhyt; if(bhyt == '' || bhyt == null){bhyt = 1;}
  var buong = req.body.buong; if(buong == ''){buong = null;}
  var chenhlech = req.body.chenhlech; if(chenhlech == '' || chenhlech == null){chenhlech = 0;}
  var dalappttt = req.body.dalappttt; if(dalappttt == ''){dalappttt = null;}
  var dath = req.body.dath; if(dath == '' || dath == null){dath = 0;}
  var dathu = req.body.dathu; if(dathu == '' || dathu == null){dathu = 0;}
  var dichvu = req.body.dichvu; if(dichvu == '' || dichvu == null){dichvu = 0;}
  var divat = req.body.divat; if(divat == ''){divat = null;}
  var dongia = req.body.dongia; if(dongia == '' || dongia == null){dongia = 0;}
  var dongiausd = req.body.dongiausd; if(dongiausd == '' ){dongiausd = 0;}
  var ghino = req.body.ghino; if(ghino == '' ){ghino = null;}
  var giabh = req.body.giabh; if(giabh == '' || giabh == null){giabh = 0;}
  var giabhdm = req.body.giabhdm; if(giabhdm == '' || giabhdm == null){giabhdm = 0;}
  var giocls = req.body.giocls; if(giocls == ''){giocls = null;}
  var giolaymau = req.body.giolaymau; if(giolaymau == ''){giolaymau = null;}
  var id = req.body.id; if(id == ''){id = null;}
  var idchidinh = req.body.idchidinh; if(idchidinh == ''){idchidinh = null;} 
  var idcobas = req.body.idcobas; if(idcobas == '' || buong == 'idcobas'){idcobas = null;}
  var iddienbien = req.body.iddienbien; if(iddienbien == ''){iddienbien = null;}
  var intoadieutri = req.body.intoadieutri; if(intoadieutri == '' || intoadieutri == null){intoadieutri = 0;}
  var ketluan =  req.body.ketluan; if(ketluan == ''){ketluan = null;}
  var kqcdoan = req.body.kqcdoan; if(kqcdoan == ''){kqcdoan = null;}
  var kqcdoanp = req.body.kqcdoanp; if(kqcdoanp == ''){kqcdoanp = null;}
  var ktcao = req.body.ktcao; if(ktcao == '' || ktcao == null){ktcao = 0;}
  var ldanh = req.body.ldanh; if(ldanh == '' || ldanh == null){ldanh = 0;}
  var loaixn = req.body.loaixn;
  var ma_giuong = req.body.ma_giuong; if(ma_giuong == ''){ma_giuong = null;}
  var maba = req.body.maba; if(maba == ''){maba = null;}
  var mabn = req.body.mabn; if(mabn == ''){mabn = null;}
  var macls = req.body.macls; if(macls == ''){macls = null;}
  var macls_byt = req.body.macls_byt;
  var macon = req.body.macon;
  var madt = req.body.madt; if(madt == ''){madt = null;}
  var madv = req.body.madv; if(madv == ''){madv = null;}
  var madv_dichvu = req.body.madv_dichvu; if(madv_dichvu == ''){madv_dichvu = null;}
  var maicd = req.body.maicd; if(maicd == ''){maicd = null;}
  var maicdp = req.body.maicdp; if(maicdp == ''){maicdp = null;}
  var makb = req.body.makb; if(makb == ''){makb = null;}
  var makl = req.body.makl; if(makl == ''){makl = null;}
  var manoigt = req.body.manoigt; if(manoigt == ''){manoigt = null;}
  var manv = req.body.manv; if(manv == ''){manv = null;}
  var maphong = req.body.maphong; if(maphong == ''){maphong = null;}
  var mathe = req.body.mathe;if(mathe == ''){mathe = null;}
  var miengiam = req.body.miengiam ;if(miengiam == '' || miengiam == null){miengiam = 0;}
  var mienphi = req.body.mienphi ;if(mienphi == '' || mienphi == null){mienphi = 0;}
  var nam_qt = req.body.nam_qt ;if(nam_qt == ''){nam_qt = null;}
  var namkt = req.body.namkt ;if(namkt == ''){namkt = null;}
  var ngaycd = req.body.ngaycd ;if(ngaycd == ''){ngaycd = null;}
  var ngaygiolaymau = req.body.ngaygiolaymau ;if(ngaygiolaymau == ''){ngaygiolaymau = null;}
  var ngaykcb = req.body.ngaykcb ;if(ngaykcb == ''){ngaykcb = null;}
  var ngayxoa = req.body.ngayxoa ;if(ngayxoa == ''){ngayxoa = null;}
  var noitru = req.body.noitru ;if(noitru == '' ||  noitru == null){noitru = 1;}
  var ppcham = req.body.ppcham ;if(ppcham == ''){ppcham = null;}
  var ptmiengiam = req.body.ptmiengiam ;if(ptmiengiam == '' ||  ptmiengiam == null){ptmiengiam = 0;}
  var pttraituyen = req.body.pttraituyen ;if(pttraituyen == '' || pttraituyen == null){pttraituyen = 0;}
  var soct = req.body.soct;if(soct == ''){soct = null;}
  var soctvp = req.body.soctvp;
  var soctvpbltong = req.body.soctvpbltong; if(soctvpbltong == ''){soctvpbltong = null;}
  var soctvpcl = req.body.soctvpcl;
  var soctvphd = req.body.soctvphd ;if(soctvphd == ''){soctvphd = null;}
  var sogiuong = req.body.sogiuong ;if(sogiuong == ''){sogiuong = null;}
  var solaninchidinh = req.body.solaninchidinh ;if(solaninchidinh == ''){solaninchidinh = null;}
  var soluong = req.body.soluong ;if(soluong == '' ||  soluong == null){soluong = 1;}
  var sophong = req.body.sophong ;if(sophong == ''){sophong = null;}
  var soth = req.body.soth ;if(soth == ''){soth = null;}
  var stt = req.body.stt ;if(stt == '' ||  stt == null){stt = 0;}
  var stt_led = req.body.stt_led ;if(stt_led == '' || stt_led == null){stt_led = null;}
  var taikhoan = req.body.taikhoan ;if(taikhoan == ''){taikhoan = null;}
  var tamin = req.body.tamin ;if(tamin == '' ||  tamin == null){tamin = 0;}
  var tenclsphu = req.body.tenclsphu ;if(tenclsphu == ''){tenclsphu = null;}
  var tenmay = req.body.tenmay ;if(tenmay == ''){tenmay = null;}
  var thang_qt = req.body.thang_qt ;if(thang_qt == null || thang_qt == ''){thang_qt = '';}
  var thangkt = req.body.thangkt ;//if(thangkt == ''){thangkt = null;}
  var thanhtien = req.body.thanhtien ;if(thanhtien == '' ||  thanhtien == null){thanhtien = 0;}
  var thanhtienmg = req.body.thanhtienmg ;if(thanhtienmg == '' || thanhtienmg == null){thanhtienmg = 0;}
  var thanhtienusd = req.body.thanhtienusd ;if(thanhtienusd == '' || thanhtienusd == null){thanhtienusd = 0;}
  var thatthuchenhlech = req.body.thatthuchenhlech ;if(thatthuchenhlech == ''){thatthuchenhlech = null;}
  var thuphi = req.body.thuphi ;if(thuphi == '' ||  thuphi == null){thuphi = 0;}
  var tile = req.body.tile ;if(tile == '' || tile == null){tile = 100;}
  var tinhtrang = req.body.tinhtrang ;if(tinhtrang == '' || tinhtrang == null){tinhtrang = 1;}
  var tinhtranglaymau = req.body.tinhtranglaymau ;if(tinhtranglaymau == ''){tinhtranglaymau = null;}
  var tinhtrangmau = req.body.tinhtrangmau ;if(tinhtrangmau == ''){tinhtrangmau = null;}
  var dain = req.body.dain ;if(dain == '' || dain == null){dain = 0;}
  var chiphint = req.body.chiphint ;if(chiphint == '' || chiphint == null){chiphint = 0;}
  var toacon = req.body.toacon ;if(toacon == '' || toacon == null){toacon = 0;}
  var travedieutri = req.body.travedieutri ;if(travedieutri == '' || travedieutri == null){travedieutri = 0;}
  var tygia = req.body.tygia ;if(tygia == ''){tygia = 0;}
  var xoa = req.body.xoa ;if(xoa == '' || xoa == null){xoa = 0;}
  var sql = ` INSERT INTO current.chidinhcls(mabn,makb,noitru,madt,madv,maphong,ngaykcb,manv,soct,soctvp,
              macls,makl,ketluan,soluong,dongia,giabh,chenhlech,miengiam,ptmiengiam,thanhtien,dath,dain,
              dathu,taikhoan,tenmay,thangkt,namkt,maicd,kqcdoan,dichvu,sogiuong,maba,mathe,
              thanhtienmg,loaixn,id,stt,iddienbien,tinhtrang,tamin,intoadieutri,ngaycd,travedieutri,buong,
              toacon,macon,dongiausd,thanhtienusd,tygia,bhyt,ktcao,ldanh,pttraituyen,soctvphd,soctvpbltong,
              giocls,thuphi,mienphi,divat,idchidinh,soth,soctvpcl,idcobas,ghino,bant,chiphint,madv_dichvu,
              tenclsphu,thang_qt,nam_qt,tile,giabhdm,ma_giuong,manoigt,maicdp,kqcdoanp,ppcham,giolaymau,
              solaninchidinh,dalappttt) 
              VALUES ('`+mabn+`','`+makb+`',`+noitru+`,'`+madt+`','`+madv+`','`+maphong+`',TO_TIMESTAMP('`+ngaykcb+`', 'HH24:MI:ss dd-mm-yyyy'),'`+manv+`',
              '`+soct+`','`+soctvp+`','`+macls+`','`+makl+`','`+ketluan+`',`+soluong+`,`+dongia+`,`+giabh+`,
               `+chenhlech+`,`+miengiam+`,`+ptmiengiam+`,`+thanhtien+`,`+dath+`,`+dain+`,`+dathu+`,
              '`+taikhoan+`','`+tenmay+`','`+thangkt+`','`+namkt+`','`+maicd+`','`+kqcdoan+`',
               `+dichvu+`,'`+sogiuong+`','`+maba+`','`+mathe+`',`+thanhtienmg+`,'`+loaixn+`','`+id+`',`+stt+`,
              '`+iddienbien+`',`+tinhtrang+`,`+tamin+`,`+intoadieutri+`,TO_TIMESTAMP('`+ngaycd+`', 'HH24:MI:ss dd-mm-yyyy'),`+travedieutri+`,'`+buong+`',
               `+toacon+`,'`+macon+`',`+dongiausd+`,`+thanhtienusd+`,`+tygia+`,`+bhyt+`,`+ktcao+`,`+ldanh+`,
               `+pttraituyen+`,'`+soctvphd+`','`+soctvpbltong+`',`+giocls+`,`+thuphi+`,`+mienphi+`,
              '`+divat+`','`+idchidinh+`','`+soth+`','`+soctvpcl+`','`+idcobas+`',`+ghino+`,`+bant+`,`+chiphint+`,
              '`+madv_dichvu+`','`+tenclsphu+`',`+thang_qt+`,'`+nam_qt+`',`+tile+`,`+giabhdm+`,'`+ma_giuong+`',
              '`+manoigt+`','`+maicd+`','`+kqcdoanp+`','`+ppcham+`',`+giolaymau+`,`+solaninchidinh+`,`+dalappttt+`)`;
  client.query(sql, (err, res1)=>{
    if(err == null){
      res.send(res1.rows);
      res.end();
    }else{
      res.send(err);
      res.end();
    }
  })
})



//Load cls đã thêm
app.post('/AppDH/chidinhcls/LoadClsDaThem', (req, res)=>{
  const mabn = req.body.mabn;
  const ngaycd = req.body.ngaycd;
  var sql = ` SELECT ds.macls, ds.tencls, ds.giabh07, ds.giadan07, ds.giadv07, cls.ngaycd, cls.ngaykcb
              FROM current.chidinhcls cls, current.dmcls ds
              WHERE ds.macls = cls.macls
              AND cls.mabn = '`+mabn+`'
              AND cls.ngaycd = '`+ngaycd+`'`;
  client.query(sql, (err, res1)=>{
    if (res1 == null) {
      res.send('null');
      res.end();
    }else{
      res.send(res1.rows);
      res.end();
    }
   
  })
})


//Load lịch sử CLS
app.post('/AppDH/chidinhcls/LoadLichSuCls', (req, res)=>{
  const mabn = req.body.mabn;
  const macon = req.body.macon;
  var sql = ` SELECT DISTINCT CAST(to_char(cls.ngaycd, 'dd/mm/yyyy HH24:MI:ss') as varchar) as ngaycd ,
  			  nv.holot, nv.ten, cls.iddienbien, cls.dath,cls.idchidinh, cls.macon,
  			  CAST(to_char(cls.ngaycd, 'yyyymmdd HH24MIss') as varchar) as tt
              FROM current.chidinhcls cls, current.dmnhanvien nv
              WHERE cls.taikhoan = nv.taikhoan
              AND cls.mabn='`+mabn+`'
              AND cls.xoa=0
              AND cls.macon = '`+macon+`'
              ORDER BY tt DESC`;
  client.query(sql, (err, res1)=>{
    if (res1 == null) {
      res.send('null');
      res.end();
    }else{
      res.send(res1.rows);
      res.end();
    }
  })
})

//Load tổng tiền CLS
app.post('/AppDH/chidinhcls/LoadTongTienCls', (req, res)=>{
  const mabn = req.body.mabn;
  var sql = ` SELECT SUM(cls.thanhtien)
              FROM current.chidinhcls cls
              WHERE cls.mabn='`+mabn+`'
              AND cls.xoa = 0`;
  client.query(sql, (err, res1)=>{
    if (res1 == null) {
      res.send('null');
      res.end();
    }else{
      res.send(res1.rows);
      res.end();
    }
  })
})

//Load tổng tiền CLS theo ID
app.post('/AppDH/chidinhcls/LoadTongTienCls', (req, res)=>{
  const mabn = req.body.mabn;
  const idchidinh = req.body.idchidinh;
  const ngaycd = req.body.ngaycd;
  var sql = ` SELECT SUM(cls.thanhtien)
              FROM current.chidinhcls cls
              WHERE cls.mabn='`+mabn+`'
              AND cls.idchidinh = '`+idchidinh+`'
              AND cls.ngaycd = '`+ngaycd+`'
              AND cls.xoa = 0`;
  client.query(sql, (err, res1)=>{
    if (res1 == null) {
      res.send('null');
      res.end();
    }else{
      res.send(res1.rows);
      res.end();
    }
  })
})

//Load CLS theo ID
app.post('/AppDH/chidinhcls/LoadClsTheoID', (req, res)=>{
  const mabn = req.body.mabn;
  const ngaycd = req.body.ngaycd;
  var sql = ` SELECT cls.macls, cls.soluong, cls.thanhtien, dm.tencls,cls.idchidinh
              FROM current.chidinhcls cls, current.dmcls dm
              WHERE cls.mabn='`+mabn+`'
              AND cast(to_char(cls.ngaycd, 'dd/mm/yyyy HH24:MI:ss') as varchar) = '`+ngaycd+`'
              AND cls.macls = dm.macls
              AND cls.xoa = 0`;
  client.query(sql, (err, res1)=>{
    if (res1 == null) {
      res.send('null');
      res.end();
    }else{
      res.send(res1.rows);
      res.end();
    }
  })
})


//Load tổng tiền CLS theo ID
app.post('/AppDH/chidinhcls/LoadTongTienClsTheoID', (req, res)=>{
  const mabn = req.body.mabn;
  const ngaycd = req.body.ngaycd;
  const idchidinh = req.body.idchidinh;
  var sql = ` SELECT SUM(cls.thanhtien)
              FROM current.chidinhcls cls
              WHERE cls.mabn='`+mabn+`'
              AND cls.idchidinh = '`+idchidinh+`'
              AND cast(to_char(cls.ngaycd, 'dd/mm/yyyy HH24:MI:ss') as varchar) = '`+ngaycd+`'
              AND cls.xoa = 0`;
  client.query(sql, (err, res1)=>{
    if (res1 == null) {
      res.send('null');
      res.end();
    }else{
      res.send(res1.rows);
      res.end();
    }
  })
})

//delete lịch sử CLS
app.post('/AppDH/chidinhcls/chidinhclsAction/lichsuclsdelete', (req, res)=>{
  const mabn = req.body.mabn;
  const idchidinh = req.body.idchidinh;
  var sql = ` UPDATE current.chidinhcls SET xoa=1,ngayxoa = LOCALTIMESTAMP WHERE mabn = '`+mabn+`' AND idchidinh = '`+idchidinh+`'`;
  client.query(sql, (err, res1)=>{
    if (res1 == null) {
      res.send('null');
      res.end();
    }else{
      res.send(res1.rows);
      res.end();
    }
  })
})


//Load loại CLS
app.post('/AppDH/chidinhcls/PhanLoaiCls/LoadLoaiCls', (req, res)=>{
  var sql = ` SELECT lc.tenloai, lc.maloai
              FROM current.dmloaicls lc
              ORDER BY lc.tenloai`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Load all CLS
app.post('/AppDH/chidinhcls/PhanLoaiCls/LoadClsAll', (req, res)=>{
  const gioitinh = req.body.gioitinh;
  var sql = ` SELECT ds.macls, ds.tencls, ds.giabh07, ds.giadan07, ds.giadv07
              FROM current.dmcls ds
              WHERE ds.tt37 = '1'
              AND ds.sudung = '1'
              AND ds.macha = ''
              AND ds.gioitinh != '`+gioitinh+`'
              ORDER BY ds.macls`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Load theo loại CLS
app.post('/AppDH/chidinhcls/PhanLoaiCls/LoadTheoLoaiCls', (req, res)=>{
  const maloai = req.body.maloai;
  var sql = ` SELECT ds.macls, ds.tencls, ds.giabh07, ds.giadan07, ds.giadv07
              FROM current.dmcls ds
              WHERE ds.maloai = '`+maloai+`'
              AND ds.tt37 = '1'
              AND ds.sudung = '1'
              AND ds.macha = ''
              ORDER BY ds.macls`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})




//Load cls con
app.post('/AppDH/chidinhcls/LoadClsCon', (req, res)=>{
  const macha = req.body.macha;
  var sql = ` SELECT DISTINCT ds.macls,ds.macha, ds.tencls
              FROM current.dmcls ds
              WHERE ds.macha = '`+macha+`'
              AND ds.sudung = '1'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Kiểm tra cls thực hiện
app.post('/AppDH/chidinhcls/KiemTraClsThucHien', (req, res)=>{
  const macls = req.body.macls;
  var sql = ` SELECT ds.thuchien
              FROM current.dmcls ds
              WHERE ds.macls = '`+macls+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})

//Load thông tin cls
app.post('/AppDH/chidinhcls/LoadThongTin', (req, res)=>{
  const macls = req.body.macls;
  var sql = ` SELECT ds.macls, ds.tencls, ds.giabh07, ds.giadan07, ds.giadv07, ds.dichvu, ds.stt, ds.bhyt, ds.ldanh, ds.ktcao, ds.pttraituyen, ds.mienphi, ds.chiphint
              FROM current.dmcls ds
              WHERE ds.macls = '`+macls+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Load thông tin cls
app.post('/AppDH/chidinhcls/LayGia', (req, res)=>{
  const macls = req.body.macls;
  var sql = ` SELECT ds.giabh07, ds.giadan07, ds.giadv07, ds.bhyt, ds.tencls
              FROM current.dmcls ds
              WHERE ds.macls = '`+macls+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Delete cls
app.post('/AppDH/chidinhcls/chidinhclsAction/deletecls', (req, res)=>{
  const macls = req.body.macls;
  const idchidinh = req.body.idchidinh;
  var sql = ` UPDATE current.chidinhcls SET xoa= 1 ,ngayxoa = LOCALTIMESTAMP 
              WHERE macls = '`+macls+`' AND idchidinh = '`+idchidinh+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


//Hủy cls
app.post('/AppDH/chidinhcls/chidinhclsAction/huycls', (req, res)=>{
  const macls = req.body.macls;
  const mabn = req.body.mabn;
  const iddienbien = req.body.iddienbien;
  const ngaycd = req.body.ngaycd;
  var sql = ` DELETE FROM current.chidinhcls as cls 
              WHERE cls.macls = '`+macls+`'
              AND cls.mabn = '`+mabn+`' 
              AND cls.iddienbien = '`+iddienbien+`'
              AND cls.ngaycd = '`+ngaycd+`'`;
  client.query(sql, (err, res1)=>{
    res.send(res1.rows);
    res.end();
  })
})


app.listen(port, () => {
  console.log(`Connect thành công port ${port}`)
})

function authenToken(req, res, next){
  const authorizationHeader = req.headers['authorization'];
  const token = authorizationHeader.split(' ')[1];
  if(!token) res.send('401');

  jwt.verify(TOKEN_SECRET, (err, data)=>{
    if(err) res.send('401');
    next();
  })
}