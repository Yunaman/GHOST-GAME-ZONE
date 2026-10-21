'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Banknote,
  PlusCircle,
  Search,
  KeyRound,
  Edit2,
  LogOut,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Tenant } from '@/types';
import {
  registerCustomerAction,
  updateCustomerAction,
  resetCustomerPasswordAction,
} from '@/app/admin-actions';
import { logoutAction } from '@/app/auth-actions';

interface AdminClientViewProps {
  overview: {
    totalCount: number;
    activeCount: number;
    suspendedCount: number;
    paidCount: number;
    pendingCount: number;
    totalSales: number;
    tenants: Tenant[];
  };
  ownerUsername: string;
}

export function AdminClientView({ overview, ownerUsername }: AdminClientViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration Form State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    owner_name: '',
    username: '',
    password: '',
    license_price: 5000,
    payment_status: 'PAID' as 'PAID' | 'PENDING',
    account_status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
  });

  // Edit Tenant Modal State
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    owner_name: '',
    payment_status: 'PAID' as 'PAID' | 'PENDING',
    account_status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
  });

  // Reset Password Modal State
  const [pwResetTenant, setPwResetTenant] = useState<Tenant | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const filteredTenants = overview.tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regForm.name || !regForm.username || !regForm.password) {
      setErrorMsg('Game zone name, username, and initial password are required.');
      return;
    }

    startTransition(async () => {
      const res = await registerCustomerAction({
        name: regForm.name.trim(),
        owner_name: regForm.owner_name.trim() || 'Owner',
        username: regForm.username.trim(),
        password: regForm.password,
        license_price: Number(regForm.license_price) || 5000,
        payment_status: regForm.payment_status,
        account_status: regForm.account_status,
      });

      if (res.success) {
        setSuccessMsg(`Game zone "${regForm.name}" registered successfully!`);
        setShowRegModal(false);
        setRegForm({
          name: '',
          owner_name: '',
          username: '',
          password: '',
          license_price: 5000,
          payment_status: 'PAID',
          account_status: 'ACTIVE',
        });
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to register game zone.');
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await updateCustomerAction(editingTenant.id, editForm);
      if (res.success) {
        setSuccessMsg(`Updated details for ${editForm.name}.`);
        setEditingTenant(null);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to update tenant.');
      }
    });
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwResetTenant || !newPassword) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await resetCustomerPasswordAction(pwResetTenant.id, newPassword);
      if (res.success) {
        setSuccessMsg(`Password reset successfully for ${pwResetTenant.name}.`);
        setPwResetTenant(null);
        setNewPassword('');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to reset password.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#040508] text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0a0c12] p-5 rounded-2xl border border-purple-900/50 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <ShieldAlert className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-gaming font-black text-white tracking-wide">
                GHOST GAME CENTER
              </h1>
              <p className="text-xs text-purple-300 font-medium">
                Product Owner Dashboard &bull; Signed in as <span className="text-purple-200 font-bold">{ownerUsername}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRegModal(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-gaming text-xs font-bold text-white flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Customer</span>
            </button>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/80 border border-zinc-800 hover:border-red-800/80 text-zinc-400 hover:text-red-300 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* System Alert Banners */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-sm font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 font-bold">
              &times;
            </button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-sm font-medium flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 font-bold">
              &times;
            </button>
          </div>
        )}

        {/* Business Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#0a0c12] p-4 rounded-xl border border-zinc-800/80 space-y-1">
            <div className="text-zinc-400 text-xs font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Game Zones</span>
            </div>
            <div className="text-xl font-gaming font-black text-white">{overview.totalCount}</div>
          </div>

          <div className="bg-[#0a0c12] p-4 rounded-xl border border-zinc-800/80 space-y-1">
            <div className="text-zinc-400 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active</span>
            </div>
            <div className="text-xl font-gaming font-black text-emerald-400">{overview.activeCount}</div>
          </div>

          <div className="bg-[#0a0c12] p-4 rounded-xl border border-zinc-800/80 space-y-1">
            <div className="text-zinc-400 text-xs font-medium flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span>Suspended</span>
            </div>
            <div className="text-xl font-gaming font-black text-red-400">{overview.suspendedCount}</div>
          </div>

          <div className="bg-[#0a0c12] p-4 rounded-xl border border-zinc-800/80 space-y-1">
            <div className="text-zinc-400 text-xs font-medium flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Revenue</span>
            </div>
            <div className="text-xl font-gaming font-black text-amber-400">{overview.totalSales.toLocaleString()} ETB</div>
          </div>

          <div className="bg-[#0a0c12] p-4 rounded-xl border border-zinc-800/80 space-y-1">
            <div className="text-zinc-400 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Paid Licenses</span>
            </div>
            <div className="text-xl font-gaming font-black text-cyan-400">{overview.paidCount}</div>
          </div>

          <div className="bg-[#0a0c12] p-4 rounded-xl border border-zinc-800/80 space-y-1">
            <div className="text-zinc-400 text-xs font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending</span>
            </div>
            <div className="text-xl font-gaming font-black text-amber-500">{overview.pendingCount}</div>
          </div>
        </div>

        {/* Customer Management Section */}
        <div className="bg-[#0a0c12] rounded-2xl border border-zinc-800/80 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-gaming font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Registered Customer Game Zones</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Manage accounts, track license payments, update details, or suspend access.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search game zones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>
          </div>

          {/* Customer Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-gaming tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3">Business Name</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Contact Person</th>
                  <th className="p-3">License</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Registered</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500 italic">
                      No game zone customers found.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-purple-950/20 transition-colors">
                      <td className="p-3 font-bold text-white">{t.name}</td>
                      <td className="p-3 font-mono text-purple-300">{t.username}</td>
                      <td className="p-3 text-zinc-400">{t.owner_name}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.payment_status === 'PAID'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-800/80'
                          }`}
                        >
                          {t.payment_status} ({t.license_price?.toLocaleString() || 5000} ETB)
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.account_status === 'ACTIVE'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                              : 'bg-red-950/80 text-red-400 border border-red-800/80'
                          }`}
                        >
                          {t.account_status}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-500 font-mono text-[11px]">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditingTenant(t);
                            setEditForm({
                              name: t.name,
                              owner_name: t.owner_name,
                              payment_status: t.payment_status,
                              account_status: t.account_status,
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-purple-950 text-zinc-300 hover:text-purple-300 border border-zinc-800 font-medium transition-all cursor-pointer"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="w-3 h-3 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setPwResetTenant(t);
                            setNewPassword('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-amber-950 text-zinc-300 hover:text-amber-300 border border-zinc-800 font-medium transition-all cursor-pointer"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3 h-3 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal 1: Register Customer */}
        {showRegModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0e121a] border border-purple-800/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-gaming font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-400" />
                <span>Register New Game Zone</span>
              </h3>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Game Zone Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Yanus Game Zone"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Owner / Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g., Yanus Tesfaye"
                    value={regForm.owner_name}
                    onChange={(e) => setRegForm({ ...regForm, owner_name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Unique Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., yanusgame"
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">License Price (ETB)</label>
                    <input
                      type="number"
                      value={regForm.license_price}
                      onChange={(e) => setRegForm({ ...regForm, license_price: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Payment</label>
                    <select
                      value={regForm.payment_status}
                      onChange={(e) =>
                        setRegForm({ ...regForm, payment_status: e.target.value as 'PAID' | 'PENDING' })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-purple-600"
                    >
                      <option value="PAID">PAID</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Status</label>
                    <select
                      value={regForm.account_status}
                      onChange={(e) =>
                        setRegForm({ ...regForm, account_status: e.target.value as 'ACTIVE' | 'SUSPENDED' })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-purple-600"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300">
                  ⚡ Registration automatically seeds 3 default TVs (TV 1, TV 2, TV 3) and default FIFA pricing (15 ETB / 5 ETB) for this customer tenant.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-gaming font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Register Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Edit Customer Details */}
        {editingTenant && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0e121a] border border-purple-800/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-gaming font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-400" />
                <span>Edit {editingTenant.name}</span>
              </h3>

              <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Game Zone Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Owner / Contact Name</label>
                  <input
                    type="text"
                    value={editForm.owner_name}
                    onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Payment Status</label>
                    <select
                      value={editForm.payment_status}
                      onChange={(e) =>
                        setEditForm({ ...editForm, payment_status: e.target.value as 'PAID' | 'PENDING' })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-purple-600"
                    >
                      <option value="PAID">PAID</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">Account Access Status</label>
                    <select
                      value={editForm.account_status}
                      onChange={(e) =>
                        setEditForm({ ...editForm, account_status: e.target.value as 'ACTIVE' | 'SUSPENDED' })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-purple-600"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTenant(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-gaming font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Reset Password */}
        {pwResetTenant && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0e121a] border border-amber-800/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-gaming font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>Reset Password for {pwResetTenant.name}</span>
              </h3>

              <form onSubmit={handlePasswordResetSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Username</label>
                  <input
                    type="text"
                    disabled
                    value={pwResetTenant.username}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new secure password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPwResetTenant(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-gaming font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
