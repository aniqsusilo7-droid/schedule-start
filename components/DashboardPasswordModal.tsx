import React, { useState, useEffect } from 'react';
import { Lock, Unlock, KeyRound, Eye, EyeOff, Check, X, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { DraggableModal } from './DraggableModal';

export type PasswordModalMode = 'create' | 'unlock' | 'change';

interface DashboardPasswordModalProps {
  isOpen: boolean;
  mode: PasswordModalMode;
  hasPassword: boolean;
  fullScreenGate?: boolean;
  onClose: () => void;
  onChangeMode: (mode: PasswordModalMode) => void;
  onUnlock: (password: string) => boolean;
  onSavePassword: (newPassword: string, oldPassword?: string) => Promise<{ success: boolean; error?: string }>;
}

export const DashboardPasswordModal: React.FC<DashboardPasswordModalProps> = ({
  isOpen,
  mode,
  hasPassword,
  fullScreenGate = false,
  onClose,
  onChangeMode,
  onUnlock,
  onSavePassword,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveMode: PasswordModalMode = !hasPassword ? 'create' : mode;

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setError(null);
      setSuccessMessage(null);
      setIsSaving(false);
    }
  }, [isOpen, effectiveMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (effectiveMode === 'unlock') {
      if (!currentPassword.trim()) {
        setError('Masukkan password terlebih dahulu.');
        return;
      }
      const ok = onUnlock(currentPassword);
      if (!ok) {
        setError('Password yang dimasukkan salah. Silakan coba lagi.');
      }
      return;
    }

    if (effectiveMode === 'create') {
      if (!newPassword.trim()) {
        setError('Password baru tidak boleh kosong.');
        return;
      }
      if (newPassword.trim().length < 3) {
        setError('Password minimal 3 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Konfirmasi password baru tidak cocok.');
        return;
      }

      setIsSaving(true);
      const res = await onSavePassword(newPassword.trim());
      setIsSaving(false);
      if (!res.success) {
        setError(res.error || 'Gagal menyimpan password ke database.');
      }
      return;
    }

    if (effectiveMode === 'change') {
      if (hasPassword && !currentPassword) {
        setError('Masukkan password saat ini terlebih dahulu.');
        return;
      }
      if (!newPassword.trim()) {
        setError('Password baru tidak boleh kosong.');
        return;
      }
      if (newPassword.trim().length < 3) {
        setError('Password baru minimal 3 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Konfirmasi password baru tidak cocok.');
        return;
      }

      setIsSaving(true);
      const res = await onSavePassword(newPassword.trim(), currentPassword);
      setIsSaving(false);
      if (!res.success) {
        setError(res.error || 'Gagal memperbarui password di database.');
      }
    }
  };

  const headerConfig = {
    unlock: {
      title: 'MASUKKAN PASSWORD',
      accentBg: 'bg-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      Icon: Lock,
    },
    create: {
      title: 'BUAT PASSWORD',
      accentBg: 'bg-emerald-600',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      Icon: ShieldCheck,
    },
    change: {
      title: 'UBAH PASSWORD',
      accentBg: 'bg-indigo-600',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
      Icon: KeyRound,
    },
  }[effectiveMode];

  const HeaderIcon = headerConfig.Icon;

  const formContent = (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div
        className={`${headerConfig.accentBg} text-white px-6 py-5 flex items-center justify-between ${
          !fullScreenGate ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-2.5 bg-white/15 rounded-xl shrink-0 border border-white/20">
            <HeaderIcon className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight truncate">
              {headerConfig.title}
            </h2>
          </div>
        </div>
        {!fullScreenGate && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {(effectiveMode === 'unlock' || (effectiveMode === 'change' && hasPassword)) && (
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
              {effectiveMode === 'unlock' ? 'Password' : 'Password Saat Ini (Lama)'}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                autoFocus
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={
                  effectiveMode === 'unlock'
                    ? 'Masukkan password...'
                    : 'Masukkan password lama...'
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 pr-11 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                tabIndex={-1}
                aria-label={showCurrent ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {(effectiveMode === 'create' || effectiveMode === 'change') && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                Password Baru
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  autoFocus={effectiveMode === 'create'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 pr-11 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showNew ? 'Sembunyikan password baru' : 'Tampilkan password baru'}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 pr-11 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Mode Switcher Link */}
        {effectiveMode === 'unlock' && hasPassword && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onChangeMode('change')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Ubah Password
            </button>
          </div>
        )}
        {effectiveMode === 'change' && hasPassword && fullScreenGate && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onChangeMode('unlock')}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              Kembali ke Masuk
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          {!fullScreenGate && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap ${headerConfig.buttonBg}`}
          >
            {effectiveMode === 'unlock' ? (
              <>
                <Unlock className="w-4 h-4" />
                Masuk
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isSaving
                  ? 'Menyimpan...'
                  : effectiveMode === 'create'
                  ? 'Simpan & Masuk'
                  : 'Simpan Password Baru'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (fullScreenGate) {
    return (
      <div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <DraggableModal className="w-full max-w-md">
        {formContent}
      </DraggableModal>
    </div>
  );
};
