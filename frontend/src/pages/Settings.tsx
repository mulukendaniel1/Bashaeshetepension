import { motion } from "framer-motion";
import {
  Building2,
  Clock3,
  DollarSign,
  Lock,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "../api";

type BusinessSettings = {
  businessName: string;
  tin: string;
  phone: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  taxRate: string;
};

export default function Settings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; settings: BusinessSettings }>(
        "/settings"
      );
      setSettings(res.settings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }

  const updateField = (field: keyof BusinessSettings, value: string) => {
    setSettings((current) => (current ? { ...current, [field]: value } : current));
    setSaved(false);
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setError("");

    try {
      const res = await api.put<{ success: boolean; settings: BusinessSettings }>(
        "/settings",
        settings
      );
      setSettings(res.settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="text-[#123c2c]" size={24} />
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Business details, stay policy, and your account.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {loading || !settings ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading settings...
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Building2 size={18} className="text-[#123c2c]" />
              <h3 className="font-bold">Business Information</h3>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Business name"
                value={settings.businessName}
                onChange={(v) => updateField("businessName", v)}
              />

              <Field
                label="TIN number"
                value={settings.tin}
                onChange={(v) => updateField("tin", v)}
              />

              <Field
                label="Phone"
                value={settings.phone}
                onChange={(v) => updateField("phone", v)}
              />

              <Field
                label="Address"
                value={settings.address}
                onChange={(v) => updateField("address", v)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Clock3 size={18} className="text-[#123c2c]" />
              <h3 className="font-bold">Stay Policy</h3>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Check-in time</label>
                <input
                  type="time"
                  value={settings.checkInTime}
                  onChange={(event) => updateField("checkInTime", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Check-out time</label>
                <input
                  type="time"
                  value={settings.checkOutTime}
                  onChange={(event) => updateField("checkOutTime", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <DollarSign size={18} className="text-[#123c2c]" />
              <h3 className="font-bold">Currency &amp; Tax</h3>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Currency code"
                value={settings.currency}
                onChange={(v) => updateField("currency", v)}
              />

              <Field
                label="Tax rate (%)"
                value={settings.taxRate}
                onChange={(v) => updateField("taxRate", v)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </motion.button>

            {saved && <p className="text-sm text-emerald-600">Saved.</p>}
          </div>
        </>
      )}

      <PasswordCard />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
      />
    </div>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Lock size={18} className="text-[#123c2c]" />
        <h3 className="font-bold">Change Password</h3>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {success && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
          />
        </div>
      </div>

      <button
        onClick={handleChangePassword}
        disabled={saving}
        className="mt-6 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Updating..." : "Update Password"}
      </button>
    </div>
  );
}