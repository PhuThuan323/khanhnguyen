import { useMemo, useState } from "react";
import Modal from "../../components/Modal";
import { money, statusText } from "../../lib/storage";
import { api } from "../../lib/api";

const blankLead = { name: "", tiktok: "", phone: "", address: "", note: "" };
const activityLabels = {
  INTEREST: "Quan tâm",
  CALL: "Gọi điện",
  MESSAGE: "Tin nhắn",
  VISIT: "Xem xe",
  FOLLOW_UP: "Chăm sóc",
  CONFIRMED: "Chốt tư vấn",
};
const date = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "—");
const sumPayments = (deal) =>
  (deal?.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);

export default function Sales({ cars, onRefresh }) {
  const [selectedId, setSelectedId] = useState(null);
  const [leadId, setLeadId] = useState("");
  const [dialog, setDialog] = useState("");
  const [leadForm, setLeadForm] = useState(blankLead);
  const [activityKind, setActivityKind] = useState("CALL");
  const [activityText, setActivityText] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const list = useMemo(
    () =>
      cars
        .filter((c) =>
          ["FOR_SALE", "CUSTOMER_CLOSED", "DEPOSITED", "SOLD"].includes(
            c.status,
          ),
        )
        .filter((c) =>
          `${c.plate} ${c.brand} ${c.model} ${c.deal?.buyer?.name || ""}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
    [cars, search],
  );
  const selected = cars.find((c) => c.id === selectedId);
  const selectedLead = selected?.leads?.find((l) => l.id === leadId);
  const totalPaid = sumPayments(selected?.deal);
  const outstanding = Math.max(
    0,
    Number(selected?.deal?.agreedPrice || 0) - totalPaid,
  );

  const openCar = (c) => {
    setSelectedId(c.id);
    setLeadId(c.leads?.[0]?.id || "");
    setError("");
    setSuccess("");
    setDialog("");
  };
  const openDialog = (kind) => {
    setDialog(kind);
    setAmount("");
    setNote("");
    setActivityText("");
    setError("");
  };
  const perform = async (action, text) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      await onRefresh();
      setDialog("");
      setSuccess(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const saveLead = () =>
    perform(async () => {
      const created = await api(`/cars/${selectedId}/leads`, {
        method: "POST",
        body: leadForm,
      });
      setLeadId(created.id);
      setLeadForm(blankLead);
    }, "Đã lưu khách quan tâm và tạo lịch sử liên hệ.");
  const saveActivity = () =>
    perform(
      () =>
        api(`/sales/cars/${selectedId}/leads/${leadId}/activities`, {
          method: "POST",
          body: { kind: activityKind, content: activityText },
        }),
      "Đã thêm lịch sử tư vấn.",
    );
  const markInterested = () =>
    perform(
      () =>
        api(`/sales/cars/${selectedId}/leads/${leadId}/confirm-interest`, {
          method: "POST",
        }),
      "Đã đánh dấu khách chốt tư vấn.",
    );
  const deposit = () =>
    perform(
      () =>
        api(`/sales/cars/${selectedId}/deposit`, {
          method: "POST",
          body: { leadId, amount: Number(amount), note },
        }),
      "Đã xác nhận cọc. Xe đã khóa cho một người mua duy nhất.",
    );
  const payment = () =>
    perform(
      () =>
        api(`/sales/cars/${selectedId}/payments`, {
          method: "POST",
          body: { amount: Number(amount), note },
        }),
      "Đã ghi nhận thanh toán.",
    );
  const sold = () => {
    if (
      !window.confirm(
        `Xác nhận xe ${selected.plate} đã bán cho ${selected.deal?.buyer?.name}? Thao tác này sẽ khóa hồ sơ bán.`,
      )
    )
      return;
    perform(
      () => api(`/sales/cars/${selectedId}/sold`, { method: "POST" }),
      "Đã xác nhận bán xe và lưu hồ sơ người mua.",
    );
  };
  const showDeposit =
    selected &&
    ["FOR_SALE", "CUSTOMER_CLOSED"].includes(selected.status) &&
    !selected.deal;

  return (
    <div className="page-content sales-v4">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">CUSTOMER JOURNEY</div>
          <h2>Kinh doanh & lịch sử khách hàng</h2>
          <p>
            Theo dõi tất cả khách quan tâm, đặt cọc, thanh toán và hồ sơ người
            mua cuối cùng.
          </p>
        </div>
      </div>
      <div className="stats-strip">
        <div>
          <b>{list.length}</b>
          <span>Hồ sơ xe</span>
        </div>
        <div>
          <b>{list.reduce((sum, c) => sum + c.leads.length, 0)}</b>
          <span>Lượt khách quan tâm</span>
        </div>
        <div>
          <b>{list.filter((c) => c.status === "DEPOSITED").length}</b>
          <span>Xe đang nhận cọc</span>
        </div>
        <div>
          <b>{list.filter((c) => c.status === "SOLD").length}</b>
          <span>Xe đã bán</span>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Hồ sơ kinh doanh</h3>
            <p>Chọn một xe để mở lịch sử toàn bộ khách hàng.</p>
          </div>
          <input
            aria-label="Tìm xe"
            className="sales-search"
            placeholder="Tìm biển số, dòng xe, khách mua..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>XE</th>
                <th>GIÁ NIÊM YẾT</th>
                <th>KHÁCH QUAN TÂM</th>
                <th>NGƯỜI ĐẶT CỌC / MUA</th>
                <th>TRẠNG THÁI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>
                      {c.brand} {c.model}
                    </b>
                    <small>
                      {c.plate} · {c.year}
                    </small>
                  </td>
                  <td>
                    <b>{money(c.salePrice)}</b>
                  </td>
                  <td>{c.leads.length} khách</td>
                  <td>
                    <b>{c.deal?.buyer?.name || "Chưa có khách cọc"}</b>
                    {c.deal?.buyer && <small>{c.deal.buyer.phone}</small>}
                  </td>
                  <td>
                    <span className={`status status-${c.status.toLowerCase()}`}>
                      {statusText[c.status]}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openCar(c)}
                    >
                      Xem hồ sơ →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && (
            <div className="empty">
              Không tìm thấy xe đang hoặc đã kinh doanh.
            </div>
          )}
        </div>
      </div>

      {selected && (
        <Modal
          title={`Lịch sử kinh doanh · ${selected.plate}`}
          subtitle={`${selected.brand} ${selected.model} · ${selected.year}`}
          wide
          onClose={() => setSelectedId(null)}
        >
          {error && <div className="app-error inline-error">{error}</div>}
          {success && <div className="notice success-notice">{success}</div>}
          <div className="sales-overview">
            <div>
              <small>Giá niêm yết</small>
              <strong>{money(selected.salePrice)}</strong>
            </div>
            <div>
              <small>Khách quan tâm</small>
              <strong>{selected.leads.length}</strong>
            </div>
            <div>
              <small>Đã thanh toán</small>
              <strong>{selected.deal ? money(totalPaid) : "—"}</strong>
            </div>
            <div>
              <small>Còn phải thu</small>
              <strong>{selected.deal ? money(outstanding) : "—"}</strong>
            </div>
          </div>
          <div className="sales-detail-grid">
            <section className="sales-card">
              <div className="sales-section-title">
                <div>
                  <h4>Danh sách khách quan tâm</h4>
                  <p>Mỗi khách có lịch sử trao đổi riêng.</p>
                </div>
                {selected.status !== "SOLD" && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setLeadForm(blankLead);
                      openDialog("lead");
                    }}
                  >
                    ＋ Thêm khách
                  </button>
                )}
              </div>
              <div className="sales-leads">
                {selected.leads.map((l) => (
                  <button
                    key={l.id}
                    className={`sales-lead ${leadId === l.id ? "selected" : ""}`}
                    onClick={() => setLeadId(l.id)}
                  >
                    <strong>{l.name}</strong>
                    <small>
                      {l.phone} {l.tiktok ? `· ${l.tiktok}` : ""}
                    </small>
                    <span>
                      {(l.activities || []).length} hoạt động ·{" "}
                      {date(l.createdAt)}
                    </span>
                    {selected.deal?.buyerLeadId === l.id && (
                      <em>
                        {selected.status === "SOLD"
                          ? "Khách đã mua"
                          : "Khách đặt cọc"}
                      </em>
                    )}
                  </button>
                ))}
                {!selected.leads.length && (
                  <div className="empty empty-inline">
                    Chưa có khách quan tâm. Hãy thêm khách để bắt đầu theo dõi.
                  </div>
                )}
              </div>
            </section>
            <section className="sales-card">
              {selectedLead ? (
                <>
                  <div className="sales-section-title">
                    <div>
                      <h4>{selectedLead.name}</h4>
                      <p>
                        {selectedLead.phone} ·{" "}
                        {selectedLead.address || "Chưa có địa chỉ"}
                      </p>
                    </div>
                    {selected.status !== "SOLD" && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openDialog("activity")}
                      >
                        ＋ Ghi lịch sử
                      </button>
                    )}
                  </div>
                  <div className="sales-timeline">
                    {(selectedLead.activities || []).map((a) => (
                      <div className="sales-timeline-event" key={a.id}>
                        <span className="timeline-mark" />
                        <div>
                          <b>{activityLabels[a.kind] || a.kind}</b>
                          <small>
                            {date(a.createdAt)} ·{" "}
                            {a.createdBy?.name || "Nhân viên"}
                          </small>
                          <p>{a.content || "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {["FOR_SALE", "CUSTOMER_CLOSED"].includes(
                    selected.status,
                  ) && (
                    <div className="sales-action-bar">
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={markInterested}
                      >
                        Chốt tư vấn
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={busy || !showDeposit}
                        onClick={() => openDialog("deposit")}
                      >
                        Xác nhận cọc cho khách này
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty empty-inline">
                  Chọn khách bên trái để xem lịch sử tư vấn.
                </div>
              )}
            </section>
          </div>
          {selected.deal && (
            <section className="sales-card sales-deal-card">
              <div className="sales-section-title">
                <div>
                  <h4>
                    {selected.status === "SOLD"
                      ? "Hồ sơ xe đã bán"
                      : "Hồ sơ đặt cọc & thanh toán"}
                  </h4>
                  <p>
                    Người mua được khóa theo hồ sơ cọc, không thể đổi sang khách
                    thứ hai.
                  </p>
                </div>
                <span
                  className={`status status-${selected.status.toLowerCase()}`}
                >
                  {statusText[selected.status]}
                </span>
              </div>
              <div className="deal-meta">
                <span>
                  Người mua: <b>{selected.deal.buyer?.name}</b>
                </span>
                <span>
                  Điện thoại: <b>{selected.deal.buyer?.phone}</b>
                </span>
                <span>
                  Giá giao dịch: <b>{money(selected.deal.agreedPrice)}</b>
                </span>
                <span>
                  Ngày nhận cọc: <b>{date(selected.deal.depositedAt)}</b>
                </span>
                {selected.deal.soldAt && (
                  <span>
                    Ngày xác nhận bán: <b>{date(selected.deal.soldAt)}</b>
                  </span>
                )}
              </div>
              <div className="sales-payment-head">
                <h4>Lịch sử thanh toán</h4>
                {selected.status === "DEPOSITED" && outstanding > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openDialog("payment")}
                  >
                    ＋ Ghi nhận thanh toán
                  </button>
                )}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>THỜI ĐIỂM</th>
                      <th>HÌNH THỨC</th>
                      <th>NGƯỜI GHI NHẬN</th>
                      <th>GHI CHÚ</th>
                      <th>SỐ TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.deal.payments.map((p) => (
                      <tr key={p.id}>
                        <td>{date(p.receivedAt)}</td>
                        <td>
                          {p.kind === "DEPOSIT"
                            ? "Tiền cọc"
                            : "Thanh toán bổ sung"}
                        </td>
                        <td>{p.createdBy?.name || "Admin"}</td>
                        <td>{p.note || "—"}</td>
                        <td>
                          <b>{money(p.amount)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selected.status === "DEPOSITED" && (
                <div className="sales-action-bar">
                  <span>
                    Còn phải thu: <b>{money(outstanding)}</b>
                  </span>
                  <button
                    className="btn btn-primary"
                    disabled={busy || outstanding > 0}
                    onClick={sold}
                  >
                    Xác nhận đã bán & lưu hồ sơ
                  </button>
                </div>
              )}
              {selected.status === "SOLD" && (
                <div className="notice success-notice">
                  Xe đã bán cho {selected.deal.buyer?.name}. Hồ sơ và các giao
                  dịch thanh toán được lưu lại để tra cứu.
                </div>
              )}
            </section>
          )}
          {!selected.deal && selected.status === "DEPOSITED" && (
            <div className="app-error inline-error">
              Xe đã có trạng thái Đã cọc từ phiên bản cũ, nhưng chưa gắn hồ sơ
              người cọc. Cần đối soát dữ liệu trước khi bán.
            </div>
          )}
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setSelectedId(null)}
            >
              Đóng hồ sơ
            </button>
          </div>
        </Modal>
      )}

      {selected && dialog && (
        <div className="modal-backdrop nested-dialog" role="presentation">
          <div
            className="modal sales-action-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Cập nhật kinh doanh"
          >
            <div className="modal-head">
              <div>
                <h3>
                  {dialog === "lead"
                    ? "Thêm khách quan tâm"
                    : dialog === "activity"
                      ? "Ghi lịch sử liên hệ"
                      : dialog === "deposit"
                        ? "Xác nhận đặt cọc"
                        : "Ghi nhận thanh toán"}
                </h3>
                <p>
                  {selected.plate} · {selectedLead?.name || ""}
                </p>
              </div>
              <button className="close-btn" onClick={() => setDialog("")}>
                ×
              </button>
            </div>
            {error && <div className="app-error inline-error">{error}</div>}
            {dialog === "lead" && (
              <>
                {[
                  ["Tên khách hàng *", "name"],
                  ["Số điện thoại *", "phone"],
                  ["TikTok", "tiktok"],
                  ["Địa chỉ", "address"],
                ].map(([label, key]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input
                      value={leadForm[key]}
                      onChange={(e) =>
                        setLeadForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
                <div className="field">
                  <label>Ghi chú quan tâm</label>
                  <textarea
                    value={leadForm.note}
                    onChange={(e) =>
                      setLeadForm((f) => ({ ...f, note: e.target.value }))
                    }
                  />
                </div>
              </>
            )}
            {dialog === "activity" && (
              <>
                <div className="field">
                  <label>Loại liên hệ</label>
                  <select
                    value={activityKind}
                    onChange={(e) => setActivityKind(e.target.value)}
                  >
                    {["CALL", "MESSAGE", "VISIT", "FOLLOW_UP"].map((k) => (
                      <option value={k} key={k}>
                        {activityLabels[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Nội dung trao đổi</label>
                  <textarea
                    value={activityText}
                    onChange={(e) => setActivityText(e.target.value)}
                  />
                </div>
              </>
            )}
            {(dialog === "deposit" || dialog === "payment") && (
              <>
                {dialog === "deposit" && (
                  <div className="notice">
                    Chỉ một khách duy nhất được đặt cọc cho xe này:{" "}
                    <b>{selectedLead?.name}</b>. Không thể nhận cọc thêm lần
                    hai.
                  </div>
                )}
                {dialog === "payment" && (
                  <div className="notice">
                    Số tiền còn phải thu: {money(outstanding)}
                  </div>
                )}
                <div className="field">
                  <label>Số tiền (VNĐ)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Ghi chú giao dịch</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDialog("")}>
                Hủy
              </button>
              <button
                disabled={
                  busy ||
                  (dialog === "lead" &&
                    (!leadForm.name.trim() || !leadForm.phone.trim())) ||
                  (dialog === "activity" && !activityText.trim()) ||
                  (["deposit", "payment"].includes(dialog) &&
                    (!Number.isSafeInteger(Number(amount)) ||
                      Number(amount) <= 0 ||
                      Number(amount) >
                        (dialog === "deposit"
                          ? Number(selected.salePrice)
                          : outstanding)))
                }
                className="btn btn-primary"
                onClick={
                  { lead: saveLead, activity: saveActivity, deposit, payment }[
                    dialog
                  ]
                }
              >
                {busy ? "Đang lưu..." : "Xác nhận lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
