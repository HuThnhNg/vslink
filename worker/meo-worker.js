// =============================================================================
// Meo — Cloudflare Worker giu API key Gemini (khong bao gio de key trong web).
//
// Trien khai (khong can cai gi): Cloudflare dashboard -> Workers & Pages -> Create
// -> Worker -> dan TOAN BO tep nay vao -> Deploy. Roi Settings -> Variables and
// Secrets -> them Secret ten GEMINI_API_KEY. Xem README muc "Meo biet noi bang AI".
//
// Bien moi truong:
//   GEMINI_API_KEY   (Secret, bat buoc)  key lay o aistudio.google.com
//   ALLOWED_ORIGINS  (tuy chon)          vd "https://ten-ban.github.io" — chi web cua
//                                        ban goi duoc; bo trong = cho moi noi goi
//   GEMINI_MODEL     (tuy chon)          model uu tien; khong co thi thu lan luot DS_MODEL
//
// Worker chi nhan DU KIEN do web do san (xep hang, bo phan lech...), kiem tung
// truong, tu phai nam trong 400 tu cua VSL400 -> khong ai dung key nay lam chatbot
// tuy y duoc.
// =============================================================================
// Thu tu thu (cap nhat 9/2026 theo ai.google.dev/gemini-api/docs/models): ban flash-lite
// nhanh, mac dinh chi "nghi" toi thieu, co goi mien phi. Model nao da ngung (404/400) thi
// tu dong thu model sau. Muon ep mot model: dat bien GEMINI_MODEL trong Worker.
const DS_MODEL = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-2.5-flash-lite'];
const NHAN = new Set(["Anh", "Ba lô", "Bia", "Buổi chiều", "Buổi sáng", "Buổi trưa", "Buổi tối", "Bà ngoại", "Bà nội", "Bàn phím", "Bác", "Bác sĩ", "Bánh bao", "Bánh chưng", "Bánh tét", "Bánh xèo", "Báo cáo", "Bây giờ", "Bình minh", "Bóng bàn", "Bóng chuyền", "Bóng rổ", "Bóng đá", "Bún", "Bút bi", "Bút chì", "Bơi lội", "Bảng", "Bảo vệ", "Bận", "Bắt buộc", "Bắt chước", "Bệnh viện", "Bố", "Ca sĩ", "Cao (người)", "Cao (đồ vật)", "Cay", "Cho", "Chua", "Cháu", "Chìa khóa", "Chú", "Chú ý", "Chăm chỉ", "Chơi cờ", "Chạy", "Chậm chạp", "Chật", "Chết", "Chị", "Chồng", "Chợ", "Chụp hình", "Chủ nhật", "Chủ tịch", "Con bò", "Con chó", "Con dê", "Con gà", "Con gái", "Con heo", "Con mèo", "Con rùa", "Con thỏ", "Con trai", "Con trâu", "Con vịt", "Cung cấp", "Cà phê", "Cái bàn", "Cái chảo", "Cái cửa", "Cái ghế", "Cái kéo", "Cái nồi", "Cái quần", "Cái áo", "Cái đèn", "Có", "Cô", "Công ty", "Công viên", "Cũ", "Cười", "Cảm thấy", "Cảm ơn", "Cần", "Cầu lông", "Cậu", "Cắm trại", "Cục tẩy", "Cứng", "Cửa sổ", "Diễn viên", "Dài", "Dây chuyền", "Dép", "Dì", "Dũng cảm", "Dơ", "Dễ", "Dỗi", "Dở", "Dụng cụ học tập", "Dừng lại", "Dữ", "Em", "Ghét", "Già", "Giàu", "Giày", "Giám đốc", "Giáng sinh", "Giây", "Gió", "Giúp đỡ", "Giường", "Giấy nháp", "Giặt đồ", "Giỏi", "Giới thiệu", "Giờ", "Gạo", "Gần", "Gọi", "Gối (đầu)", "Gội đầu", "Hay (khen)", "Hiền", "Hiệu trưởng", "Hoàng hôn", "Hy vọng", "Hài hước", "Hàn Quốc", "Hát", "Hôi", "Hư", "Hẹp", "Họ hàng", "Học", "Học sinh", "Hứa", "Kem", "Khoe khoang", "Khám bệnh", "Khó", "Khóc", "Khô", "Không cho", "Không cần", "Không nghe lời", "Không nên", "Không quen", "Khăn quàng cổ", "Khỏe", "Kính lúp", "Kẹo", "Kẹp tóc", "Kế toán", "Laptop", "Luật sư", "Làm bài tập", "Làm việc", "Lùn", "Lười biếng", "Lạnh", "Lễ tân", "Mua bán", "Muốn", "Màu cam", "Màu hồng", "Màu nâu", "Màu trắng", "Màu tím", "Màu vàng", "Màu xanh da trời", "Màu xanh lá cây", "Màu đen", "Màu đỏ", "Mách", "Mát mẻ", "Máy bay", "Máy chiếu", "Máy giặt", "Máy tính cầm tay", "Máy điều hòa", "Mì gói", "Mùa hè", "Mùa khô", "Mùa mưa", "Mùa thu", "Mùa xuân", "Mùa đông", "Múa", "Mũ", "Mũ bảo hiểm", "Mưa", "Mạnh", "Mập", "Mặn", "Mẹ", "Mềm", "Mền", "Mệt", "Mới", "Mỹ", "Nghe", "Nghèo", "Nghề nghiệp", "Nghỉ ngơi", "Ngoan", "Ngon miệng", "Ngu ngốc", "Ngày", "Ngày Nhà giáo Việt Nam", "Ngày Quốc tế Lao động", "Ngày Quốc tế Phụ nữ", "Ngày Quốc tế Thiếu nhi", "Ngân hàng", "Ngắn", "Ngọt", "Ngủ", "Ngửi", "Nhanh", "Nhà", "Nhà hàng", "Nhà sách", "Nhà trọ", "Nhân viên phục vụ", "Nhân viên văn phòng", "Nhạt", "Nhảy cao", "Nhảy dây", "Nhầm lẫn", "Nhật Bản", "Nhẹ", "Nên", "Nói", "Nói chuyện", "Nóng", "Nông dân", "Năm", "Nước", "Nướng", "Nấu", "Nắng", "Nặng", "Nếm", "Nồi cơm điện", "Phút", "Phơi đồ", "Phở", "Quan sát", "Quen", "Quán cà phê", "Quạt (đứng)", "Quả bơ", "Quả cam", "Quả chuối", "Quả dâu", "Quả dứa", "Quả dừa", "Quả mận", "Quả xoài", "Quả đu đủ", "Quả đào", "Quả địa cầu", "Quần thun", "Quần tây", "Quần đùi", "Rượu", "Rạp chiếu phim", "Rẻ", "Rộng", "Rửa chén", "Rửa mặt", "Rửa tay", "Sai", "Sinh viên", "Siêu thị", "Sách", "Sáng tạo", "Sạch sẽ", "Sớm", "Sữa", "Taxi", "Tham lam", "Tham ăn", "Thay đổi", "Thuyền", "Thành phố", "Thái Lan", "Tháng", "Tháng ba", "Tháng bảy", "Tháng chín", "Tháng hai", "Tháng mười", "Tháng mười hai", "Tháng mười một", "Tháng một", "Tháng năm", "Tháng sáu", "Tháng tám", "Tháng tư", "Thèm", "Thích", "Thông minh", "Thú vị", "Thơm", "Thư ký", "Thước kẻ", "Thấp (đồ vật)", "Thể dục (thể thao)", "Thịt", "Thời gian", "Thời tiết", "Thứ ba", "Thứ bảy", "Thứ hai", "Thứ năm", "Thứ sáu", "Thứ tư", "Thức dậy", "Thử", "Tivi", "Tiếp tục", "Trung Quốc", "Trung thu", "Trà", "Trường Cao đẳng", "Trường học", "Trường Đại học", "Trẻ", "Trễ", "Trứng", "Trực thăng", "Tàu hỏa", "Tìm", "Túi xách", "Tường", "Tắm rửa", "Tết Âm lịch", "Tỉnh", "Tốt bụng", "Tủ lạnh", "Từ chối", "Uống", "Viên phấn", "Viết", "Việt Nam", "Vâng lời", "Vòng tay", "Võ", "Vở", "Vợ", "Xa", "Xe buýt", "Xe máy", "Xe tải", "Xe đạp", "Xem", "Xin", "Xin lỗi", "Xôi", "Xấu (người)", "Xấu (vật)", "Y tá", "Yên tĩnh", "Yêu thương", "Yếu", "Áo sơ mi", "Áo thun", "Áo đầm", "Ô tô", "Ông ngoại", "Ông nội", "Ăn", "Đau", "Đi", "Điền kinh", "Điện thoại", "Đá cầu", "Đúng", "Đầu bếp", "Đậm", "Đắng", "Đắt", "Đẹp (người)", "Đẹp (vật)", "Đọc", "Đồ buộc tóc", "Đồ dùng", "Đồng hồ đeo tay", "Đồng ý", "Ướt", "Ấm", "Ốm", "Ồn ào"]);
const MUC_DO = new Set(['dung', 'gan-dung', 'chua-dung']);
const DANH_GIA_PHAN = new Set(['khop', 'on', 'hoi-lech', 'lech-nhieu', 'khong-thay']);
const GIAI_DOAN = new Set(['dau', 'giua', 'cuoi']);

const HE_THONG = `Bạn là Mèo — một chú chó con (tên là Mèo, đúng vậy, chó tên Mèo) làm trợ giảng trong ứng dụng học Ngôn ngữ Ký hiệu Việt Nam VSLink. Người học vừa ký thử một từ. Một mô hình nhận dạng đã chấm và đo sẵn các dữ kiện dưới đây (JSON).
Quy tắc:
- Chỉ dựa vào dữ kiện đã cho. Không bịa thêm chi tiết về động tác, hình dạng ngón tay hay ý nghĩa ký hiệu mà dữ kiện không nói.
- Kết luận lấy NGUYÊN từ muc_do: "dung" = đúng, "gan-dung" = gần đúng, "chua-dung" = chưa đúng. Không được đổi kết luận.
- bo_phan (theo mô hình): tayTrai / tayPhai = hình dạng bàn tay trái / phải của người ký; canhTay = vị trí và đường đi của tay. "lech-nhieu" = khác mẫu nhiều, "hoi-lech" = hơi khác, "khop" = rất giống mẫu, "khong-thay" = camera ít thấy bàn tay đó (có thể từ này chỉ dùng một tay, nên chỉ nhắc nhẹ: nếu từ cần tay đó thì để tay lọt vào khung hình), "on" = bình thường, không cần nhắc. Ưu tiên nhắc phần "lech-nhieu" trước, rồi "hoi-lech". Khi muc_do là "dung" thì chỉ khen, không bắt lỗi.
- giai_doan_lech_nhat: đoạn đầu / giữa / cuối của động tác khác mẫu nhiều nhất (null = không rõ).
- Giọng Mèo: thân thiện, dí dỏm như một chú cún con (được đùa nhẹ đúng MỘT câu, kiểu vẫy đuôi, đánh hơi, "gâu"), nhưng không lan man.
- Đầy đủ mà súc tích: 3 đến 5 câu ngắn, tổng dưới 90 từ, phải có đủ:
  (1) kết luận kèm số: độ chắc (xac_suat đổi ra %, làm tròn) và hạng trên 400 từ; nếu chưa đúng thì nói mô hình đang tưởng là từ nào (tu_doan);
  (2) nếu chưa đúng: nhắc mọi bộ phận "lech-nhieu" hoặc "hoi-lech" và đoạn khác mẫu nhất (nếu có), gộp gọn trong một câu;
  (3) nếu chưa đúng: 1 đến 2 mẹo làm được ngay, gắn đúng phần lệch (ví dụ xem video mẫu ở tốc độ 0,5×, bật soi gương, để ý đoạn giữa); nếu ti_le_thay_tay_trai hoặc ti_le_thay_tay_phai dưới 0.6 hoặc thoi_luong_giay dưới 0.8 thì nhắc cách quay (để tay trong khung hình, ký chậm lại);
  (4) nếu muc_do là "dung": khen kèm độ chắc, nhắc phần "khop" nếu có, không bắt lỗi.
- Không khen hay chê những gì dữ kiện không có: không nói "tiến bộ", "lần trước", "luyện nhiều rồi"…; không tả ngón tay, hướng tay cụ thể.
- Viết tiếng Việt, xưng "Mèo", gọi người học là "bạn". Chỉ mở đầu bằng "Gâu!" khi hợp, đừng câu nào cũng gâu.
- Không dùng markdown, không gạch đầu dòng, không emoji.`;

const so = (x, a, b) => (typeof x === 'number' && Number.isFinite(x) && x >= a && x <= b ? x : null);

function kiemDuKien(d) {
  if (!d || typeof d !== 'object') return null;
  const tu = (x) => (typeof x === 'string' && NHAN.has(x) ? x : null);
  const ra = {
    tu_muc_tieu: tu(d.tu_muc_tieu),
    muc_do: MUC_DO.has(d.muc_do) ? d.muc_do : null,
    xep_hang: so(d.xep_hang, 1, 400),
    xac_suat: so(d.xac_suat, 0, 1),
    tu_doan: tu(d.tu_doan),
    xac_suat_tu_doan: so(d.xac_suat_tu_doan, 0, 1),
    top3: Array.isArray(d.top3) ? d.top3.slice(0, 3).map((t) => ({ tu: tu(t?.tu), p: so(t?.p, 0, 1) })) : [],
    bo_phan: {},
    giai_doan_lech_nhat: GIAI_DOAN.has(d.giai_doan_lech_nhat) ? d.giai_doan_lech_nhat : null,
    thoi_luong_giay: so(d.thoi_luong_giay, 0, 60),
    ti_le_thay_tay_trai: so(d.ti_le_thay_tay_trai, 0, 1),
    ti_le_thay_tay_phai: so(d.ti_le_thay_tay_phai, 0, 1)
  };
  for (const k of ['tayTrai', 'tayPhai', 'canhTay']) {
    const v = d.bo_phan?.[k];
    ra.bo_phan[k] = DANH_GIA_PHAN.has(v) ? v : 'on';
  }
  if (!ra.tu_muc_tieu || !ra.muc_do || ra.xep_hang === null || !ra.tu_doan) return null;
  if (ra.top3.some((t) => !t.tu || t.p === null)) return null;
  return ra;
}

function lamSach(s) {
  return s.replace(/[*#_`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 1200);
}

async function goiGemini(env, duKien) {
  const ds = env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...DS_MODEL.filter((m) => m !== env.GEMINI_MODEL)] : DS_MODEL;
  const loiCacModel = [];
  for (const model of ds) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: HE_THONG }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(duKien) }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024 }
      })
    });
    if (r.status === 404 || r.status === 400) {
      const chu = await r.text();
      // key sai thi model nao cung vay -> dung ngay, bao ro cho nguoi cai dat
      if (/API_KEY_INVALID|API key not valid/i.test(chu)) return { loi: 'GEMINI_API_KEY khong hop le', trangThai: 500 };
      let chiTiet = '';
      try {
        const e = JSON.parse(chu)?.error;
        chiTiet = [e?.status, e?.message].filter(Boolean).join(' - ').slice(0, 200);
      } catch {
        /* khong phai JSON */
      }
      // bi chan theo vi tri (may chu Cloudflare o vung Gemini khong ho tro) -> model nao cung vay
      if (/location/i.test(chiTiet)) return { loi: `Gemini HTTP ${r.status}: ${chiTiet}`, trangThai: 502 };
      loiCacModel.push(`${model}: HTTP ${r.status}${chiTiet ? ' ' + chiTiet : ''}`);
      continue; // model khong ton tai / da ngung -> thu model tiep theo
    }
    if (!r.ok) {
      // tra kem loi goc cua Google (khong chua key) de trang /kiem-tra/ biet vi sao
      let chiTiet = '';
      try {
        const e = (await r.json())?.error;
        chiTiet = [e?.status, e?.message].filter(Boolean).join(' - ').slice(0, 300);
      } catch {
        /* khong phai JSON */
      }
      return { loi: `Gemini HTTP ${r.status}${chiTiet ? ': ' + chiTiet : ''}`, trangThai: r.status === 429 ? 429 : 502 };
    }
    const j = await r.json();
    const text = (j.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => typeof p.text === 'string' && !p.thought)
      .map((p) => p.text)
      .join(' ');
    if (text.trim()) return { loiMeo: lamSach(text), model };
    loiCacModel.push(`${model}: khong co chu`);
  }
  return { loi: loiCacModel.join(' | ').slice(0, 900) || 'khong co model nao dung duoc', trangThai: 502 };
}

export default {
  async fetch(req, env) {
    const nguon = req.headers.get('Origin') || '';
    const choPhep = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
    const hopLe = choPhep.includes('*') || choPhep.includes(nguon);
    const cors = {
      'Access-Control-Allow-Origin': choPhep.includes('*') ? '*' : hopLe ? nguon : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin'
    };
    const tra = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method === 'GET') return tra({ meo: 'Gâu! Mèo đây.', co_key: Boolean(env.GEMINI_API_KEY) });
    if (req.method !== 'POST') return tra({ loi: 'chi nhan POST' }, 405);
    if (!hopLe) return tra({ loi: 'nguon khong duoc phep' }, 403);
    if (!env.GEMINI_API_KEY) return tra({ loi: 'Worker chua co GEMINI_API_KEY' }, 500);
    const than = await req.text();
    if (than.length > 4000) return tra({ loi: 'du lieu qua lon' }, 413);
    let duKien;
    try {
      duKien = kiemDuKien(JSON.parse(than).du_kien);
    } catch {
      duKien = null;
    }
    if (!duKien) return tra({ loi: 'du kien khong hop le' }, 400);
    const kq = await goiGemini(env, duKien);
    if (kq.loi) return tra({ loi: kq.loi }, kq.trangThai);
    return tra({ loi_meo: kq.loiMeo, model: kq.model });
  }
};
