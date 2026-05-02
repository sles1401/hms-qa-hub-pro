import { useState } from "react";
import { Lock, X, KeyRound } from "lucide-react";

const PIN_KEY = "hms-qa-admin-pin";

export function getStoredPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}
export function setStoredPin(pin: string) {
  localStorage.setItem(PIN_KEY, pin);
}
export function clearStoredPin() {
  localStorage.removeItem(PIN_KEY);
}

interface Props {
  mode: "verify" | "setup";
  onSuccess: () => void;
  onClose: () => void;
}

export default function AdminPinGate({ mode, onSuccess, onClose }: Props) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");
    if (mode === "setup") {
      if (pin.length < 4) return setError("PIN minimal 4 digit");
      if (pin !== confirm) return setError("PIN konfirmasi tidak cocok");
      setStoredPin(pin);
      onSuccess();
    } else {
      const stored = getStoredPin();
      if (pin === stored) onSuccess();
      else setError("PIN salah");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {mode === "setup" ? <KeyRound size={18} className="text-primary" /> : <Lock size={18} className="text-primary" />}
            {mode === "setup" ? "Set Admin PIN" : "Enter Admin PIN"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            {mode === "setup"
              ? "Buat PIN lokal untuk mengamankan Admin Mode. PIN disimpan di browser ini saja."
              : "Masukkan PIN Anda untuk mengaktifkan Admin Mode."}
          </p>
          <input
            type="password" inputMode="numeric" autoFocus value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mode === "verify" && handleSubmit()}
            placeholder="••••" maxLength={12}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {mode === "setup" && (
            <input
              type="password" inputMode="numeric" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Konfirmasi PIN" maxLength={12}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-between items-center gap-2 p-5 border-t border-border">
          {mode === "verify" ? (
            <button onClick={() => { clearStoredPin(); setError("PIN direset. Atur ulang dari toggle Admin Mode."); }}
              className="text-xs text-muted-foreground hover:text-foreground">Reset PIN</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
              {mode === "setup" ? "Save PIN" : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
