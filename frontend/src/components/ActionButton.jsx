export default function ActionButton({
  busy = false,
  busyText = 'Đang lưu...',
  className = 'btn btn-primary',
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  return (
    <button type={type} className={className} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? busyText : children}
    </button>
  );
}
