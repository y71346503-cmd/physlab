// Minimal global notifications.

export interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  sticky?: boolean;
}

let next = 1;
let list: ToastMsg[] = [];
const subs = new Set<(l: ToastMsg[]) => void>();

export function toast(text: string, opts: { action?: ToastMsg['action']; sticky?: boolean } = {}): void {
  const msg: ToastMsg = { id: next++, text, ...opts };
  list = [...list, msg];
  subs.forEach((cb) => cb(list));
  if (!opts.sticky) setTimeout(() => dismiss(msg.id), 3500);
}

export function dismiss(id: number): void {
  list = list.filter((m) => m.id !== id);
  subs.forEach((cb) => cb(list));
}

export function onToasts(cb: (l: ToastMsg[]) => void): () => void {
  subs.add(cb);
  cb(list);
  return () => subs.delete(cb);
}
