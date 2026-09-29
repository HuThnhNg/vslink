/* VSLink — doan lenh chay tren trang qipedc.moet.gov.vn/dictionary ("Video 4000 tu").
   1) Lat qua tat ca cac trang, ghi lai ten tu + ma video + giai nghia (du lieu cong khai).
   2) Lam "cau noi": trang cong cu VSLink (tab da mo trang nay) nho tai video QIPEDC de
      mo hinh cham. Chi tra loi trang VSLink (github.io / localhost), chi tai video cua
      chinh qipedc.moet.gov.vn, khong gui du lieu di dau khac. */
(async function () {
  'use strict';
  var CHO_PHEP = /^https:\/\/[a-z0-9-]+\.github\.io$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
  function log(s) { console.log('%c[VSLink]%c ' + s, 'color:#3680c2;font-weight:bold', ''); }
  if (!/qipedc\.moet\.gov\.vn$/i.test(location.hostname)) {
    alert('Hãy chạy đoạn lệnh này trên trang qipedc.moet.gov.vn/dictionary nhé.');
    return;
  }
  if (window.__vslink) { window.__vslink.baoCo(); log('Đã chạy rồi, không cần dán lại.'); return; }
  var goc = window.modalData;
  if (typeof goc !== 'function' || !document.getElementById('pagination-wrapper')) {
    alert('Hãy mở trang "Video 4000 từ" (qipedc.moet.gov.vn/dictionary), xoá ô tìm kiếm, rồi chạy lại nhé.');
    return;
  }

  // Chan tai anh thu nho cho lat trang nhanh (video khong bi anh huong).
  var meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "img-src 'none'";
  document.head.appendChild(meta);

  var ds = new Map();
  function gom() {
    var tam = [];
    window.modalData = function () { tam.push([].slice.call(arguments)); };
    try {
      document.querySelectorAll('#product a[onclick]').forEach(function (a) {
        try { if (a.onclick) a.onclick.call(a, new Event('click')); } catch (e) { /* bo qua o loi */ }
      });
    } finally { window.modalData = goc; }
    tam.forEach(function (x) {
      var ma = String(x[0] || '').trim();
      if (ma && !ds.has(ma)) ds.set(ma, { ma: ma, tu: String(x[1] || '').trim(), giai_nghia: String(x[2] || '').trim() });
    });
  }
  function cacNut() { return Array.prototype.slice.call(document.querySelectorAll('#pagination-wrapper button')); }
  function nut(p) { return cacNut().find(function (b) { return Number(b.value) === p; }); }
  function dauTrang() { var a = document.querySelector('#product a[onclick]'); return a ? a.getAttribute('onclick') : ''; }
  function doi(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // choDoi: doi noi dung trang doi (toi da ~10 giay neu trang tai cham)
  async function sang(p, choDoi) {
    var b = nut(p);
    if (!b) return false;
    var truoc = dauTrang();
    b.click();
    if (!choDoi) { await doi(300); return true; }
    for (var i = 0; i < 250; i++) { await doi(40); if (dauTrang() !== truoc) return true; }
    log('Trang ' + p + ' tải chậm, bỏ qua.');
    return true;
  }

  await sang(1, false);
  var cuoi = Math.max.apply(null, cacNut().map(function (b) { return Number(b.value) || 0; }).concat([1]));
  log('Đang gom danh sách từ ' + cuoi + ' trang…');
  gom();
  for (var p = 2; p <= cuoi; p++) {
    if (!(await sang(p, true))) { log('Không thấy nút trang ' + p + ', dừng ở đây.'); break; }
    gom();
    if (p % 20 === 0) log('… trang ' + p + '/' + cuoi + ' (' + ds.size + ' video)');
  }
  await sang(1, true);
  var danhSach = Array.from(ds.values());
  var itQua = danhSach.length < 1000
    ? '\n\nChỉ gom được ' + danhSach.length + ' video — ít hơn mong đợi. Nếu ô tìm kiếm của QIPEDC đang có chữ: xoá đi, tải lại trang (F5) rồi dán lại đoạn lệnh.'
    : '';

  // Mau duong dan video: goi thu ham cua trang voi mot ma, doc src cua khung video.
  var mau = '/videos/{ma}.mp4';
  try {
    var ifr = document.getElementById('s_expert');
    var cu = ifr ? ifr.getAttribute('src') : null;
    var thu = danhSach[0];
    if (ifr && thu) {
      goc(thu.ma, thu.tu, '', 'false');
      var src = ifr.getAttribute('src') || '';
      if (src.indexOf(thu.ma) >= 0) mau = src.split(thu.ma).join('{ma}');
      ifr.setAttribute('src', cu || '');
      // ham cua trang vua mo hop xem video -> dong lai cho gon
      setTimeout(function () {
        try {
          var hop = ifr.closest('.modal');
          if (!hop) return;
          if (window.jQuery && window.jQuery.fn && window.jQuery.fn.modal) window.jQuery(hop).modal('hide');
          else {
            var x = hop.querySelector('[data-dismiss="modal"],[data-bs-dismiss="modal"],.close,.btn-close');
            if (x) x.click();
          }
        } catch (e) { /* de nguyen */ }
      }, 800);
    }
  } catch (e) { /* giu mau mac dinh */ }
  log('Xong: ' + danhSach.length + ' video. Mẫu đường dẫn: ' + mau);

  var goiTin = { loai: 'vslink-qipedc', phien_ban: 1, goc: location.origin, mau: mau, so_luong: danhSach.length };
  window.addEventListener('message', function (e) {
    if (!CHO_PHEP.test(e.origin) || !e.data || typeof e.data !== 'object') return;
    var d = e.data;
    var nguon = e.source;
    if (d.loai === 'vslink-xin-ds') {
      nguon.postMessage(Object.assign({ ds: danhSach }, goiTin), e.origin);
      return;
    }
    if (d.loai !== 'vslink-lay-video') return;
    var u;
    try { u = new URL(String(d.url), location.href); } catch (err) { return; }
    if (u.origin !== location.origin) {
      nguon.postMessage({ loai: 'vslink-video', id: d.id, ok: false, loi: 'sai nguon' }, e.origin);
      return;
    }
    fetch(u.href)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var kieu = r.headers.get('content-type') || 'video/mp4';
        return r.arrayBuffer().then(function (buf) {
          nguon.postMessage({ loai: 'vslink-video', id: d.id, ok: true, kieu: kieu, buf: buf }, e.origin, [buf]);
        });
      })
      .catch(function (err) {
        nguon.postMessage({ loai: 'vslink-video', id: d.id, ok: false, loi: String((err && err.message) || err) }, e.origin);
      });
  });
  function baoCo() { if (window.opener) window.opener.postMessage(goiTin, '*'); }
  window.__vslink = { baoCo: baoCo, ds: danhSach };

  if (window.opener) {
    baoCo();
    setInterval(baoCo, 3000);
    log('Đã nối với trang công cụ VSLink. Cứ để tab này mở trong lúc chấm.');
    alert('VSLink: đã gom ' + danhSach.length + ' video và nối với trang công cụ.\nQuay lại tab VSLink nhé (để tab QIPEDC này mở).' + itQua);
  } else {
    var blob = new Blob([JSON.stringify(Object.assign({ ds: danhSach }, goiTin))], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qipedc-danh-sach.json';
    document.body.appendChild(a);
    a.click();
    alert('VSLink: tab này không được mở từ trang công cụ nên chưa nối được — đã tải file danh sách ' + danhSach.length + ' video.\nMuốn chấm: trên trang công cụ VSLink bấm "Mở QIPEDC", rồi dán đoạn lệnh vào tab mới mở đó.' + itQua);
  }
})();
