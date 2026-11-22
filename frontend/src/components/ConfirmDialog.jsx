import Modal from './Modal';
import ActionButton from './ActionButton';

export default function ConfirmDialog({ title, text, confirmText, busy, onClose, onConfirm }) {
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <p className="confirm-text">{text}</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Hủy</button>
        <ActionButton className="btn btn-danger" busy={busy} busyText="Đang xóa..." onClick={onConfirm}>{confirmText}</ActionButton>
      </div>
    </Modal>
  );
}
