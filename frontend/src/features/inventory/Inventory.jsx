import { useState } from "react";
import Modal from "../../components/Modal";
import { money, statusText } from "../../lib/storage";
import { api } from "../../lib/api";
export default function Inventory({ cars, onRefresh, user }) {
  const [selected, setSelected] = useState(null),
    [price, setPrice] = useState("");
  const ready = cars.filter((c) =>
    [
      "READY_FOR_REVIEW",
      "FOR_SALE",
      "CUSTOMER_CLOSED",
      "DEPOSITED",
      "SOLD",
    ].includes(c.status),
  );
  const cost = (c) =>
    Number(c.purchasePrice || 0) +
    c.maintenance.reduce((s, m) => s + Number(m.amount || 0), 0) +
    c.warranty.reduce((s, w) => s + Number(w.amount || 0), 0);
  const approve = async () => {
    if (!price || Number(price) <= 0) return alert("Nhập giá bán dự kiến");
    try { await api(`/cars/${selected.id}`, {method:"PATCH",body:{salePrice:Number(price),status:"FOR_SALE"}});await onRefresh();setSelected(null); }
    catch(e){alert(e.message)}
  };
  return (
    <div className="page-content">
      <div className="page-toolbar">
        <div>
          <div className="eyebrow">INVENTORY & PRICING</div>
          <h2>Kho xe & định giá bán</h2>
          <p>Admin duyệt giá bán sau khi hoàn tất kiểm định và bảo dưỡng.</p>
        </div>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>XE / MÃ HỒ SƠ</th>
                <th>GIÁ THU MUA</th>
                <th>PHÍ BẢO DƯỠNG</th>
                <th>GIÁ VỐN TẠM TÍNH</th>
                <th>GIÁ BÁN</th>
                <th>TRẠNG THÁI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ready.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>
                      {c.brand} {c.model}
                    </b>
                    <small>
                      {c.plate} · {c.id}
                    </small>
                  </td>
                  <td>{money(c.purchasePrice)}</td>
                  <td>
                    {money(
                      c.maintenance.reduce((s, m) => s + Number(m.amount), 0),
                    )}
                  </td>
                  <td>
                    <b>{money(cost(c))}</b>
                  </td>
                  <td>{c.salePrice ? money(c.salePrice) : "—"}</td>
                  <td>
                    <span className={`status status-${c.status.toLowerCase()}`}>
                      {statusText[c.status]}
                    </span>
                  </td>
                  <td>
                    {user.role === "ADMIN" &&
                      c.status === "READY_FOR_REVIEW" && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelected(c);
                            setPrice(c.salePrice || "");
                          }}
                        >
                          Duyệt giá bán
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ready.length === 0 && (
            <div className="empty">Chưa có xe hoàn tất bảo dưỡng.</div>
          )}
        </div>
      </div>
      {selected && (
        <Modal
          title="Duyệt giá bán xe"
          subtitle={`${selected.brand} ${selected.model} · ${selected.plate}`}
          onClose={() => setSelected(null)}
        >
          <div className="cost-breakdown">
            <div>
              <span>Giá thu mua</span>
              <b>{money(selected.purchasePrice)}</b>
            </div>
            <div>
              <span>Chi phí bảo dưỡng</span>
              <b>
                {money(
                  selected.maintenance.reduce(
                    (s, m) => s + Number(m.amount),
                    0,
                  ),
                )}
              </b>
            </div>
            <div className="cost-total">
              <span>Giá vốn hiện tại</span>
              <b>{money(cost(selected))}</b>
            </div>
          </div>
          <div className="field">
            <label>Giá bán niêm yết (VNĐ)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="notice">
            Chỉ xác nhận khi xe đã sẵn sàng đưa ra kinh doanh. Giá vốn là tổng
            giá mua và chi phí bảo dưỡng hiện ghi nhận.
          </div>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setSelected(null)}
            >
              Hủy
            </button>
            <button className="btn btn-primary" onClick={approve}>
              Xác nhận xe đủ điều kiện bán
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
