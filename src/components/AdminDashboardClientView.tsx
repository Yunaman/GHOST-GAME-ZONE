'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  AlertOctagon,
  Banknote,
  Plus,
  Search,
  Building2,
  User,
  ShieldCheck,
  Edit3,
  Power,
  ArrowLeft,
  Crown,
  Check,
  X,
  Key,
} from 'lucide-react';
import { Tenant, AdminStats } from '@/types';
import {
  registerCustomerAction,
  toggleCustomerStatusAction,
  updateCustomerGameZoneNameAction,
} from '@/app/admin-actions';

interface Props {
  initialStats: AdminStats;
  initialTenants: Tenant[];
}

export default function AdminDashboardClientView({ initialStats, initialTenants }: Props) {
  const [stats, setStats] = useState<AdminStats>(initialStats);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);

  // Registration Form State
  const [showRegModal, setShowRegModal] = useState(false);
  const [gameZoneName, setGameZoneName] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [username, setUsername] = useState('');
  const [initialPassword, setInitialPassword] = useState('1234');
  const [licenseFee, setLicenseFee] = useState('5000');
  const [regError, setRegError] = useState('');

  // Editing State
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Search/Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const [isPending, startTransition] = useTransition();

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.game_zone_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.owner_contact_name && t.owner_contact_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!gameZoneName.trim() || !username.trim() || !initialPassword.trim()) {
      setRegError('Game Zone Name, Username, and Password are required');
      return;
    }

    startTransition(async () => {
      const res = await registerCustomerAction(
        gameZoneName,
        ownerContact,
        username,
        initialPassword,
        Number(licenseFee) || 5000
      );

      if (res.success && res.data) {
        setTenants((prev) => [res.data, ...prev]);
        setStats((prev) => ({
          ...prev,
          totalCustomers: prev.totalCustomers + 1,
          activeCustomers: prev.activeCustomers + 1,
          totalLicenseRevenue: prev.totalLicenseRevenue + (res.data.license_amount || 5000),
        }));
        setGameZoneName('');
        setOwnerContact('');
        setUsername('');
        setInitialPassword('1234');
        setLicenseFee('5000');
        setShowRegModal(false);
      } else {
        setRegError(res.error || 'Failed to register customer');
      }
    });
  };

  const handleToggleStatus = (tenant: Tenant) => {
    startTransition(async () => {
      const res = await toggleCustomerStatusAction(tenant.id, tenant.status);
      if (res.success && res.data) {
        const updated = res.data;
        setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setStats((prev) => {
          const isActivating = updated.status === 'ACTIVE';
          return {
            ...prev,
            activeCustomers: prev.activeCustomers + (isActivating ? 1 : -1),
            suspendedCustomers: prev.suspendedCustomers + (isActivating ? -1 : 1),
          };
        });
      }
    });
  };

  const handleSaveName = (tenantId: string) => {
    if (!editingName.trim()) return;

    startTransition(async () => {
      const res = await updateCustomerGameZoneNameAction(tenantId, editingName);
      if (res.success && res.data) {
        const updated = res.data;
        setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setEditingTenantId(null);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#c5c6c7] p-4 sm:p-6 md:p-8 font-sans selection:bg-[#66fcf1] selection:text-[#0b0c10]">
      {/* Top Banner / Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#1f2833]">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2.5 rounded-xl bg-[#1f2833] hover:bg-[#c5c6c7]/10 text-[#45a29e] hover:text-[#66fcf1] transition-all border border-[#45a29e]/20"
              title="Return to Main Floor"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-xs uppercase tracking-widest font-mono text-amber-400/90 font-bold">
                  PRODUCT OWNER CONTROL CENTER
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                GHOST GAME CENTER <span className="text-[#66fcf1] text-lg font-mono font-normal">ADMIN</span>
              </h1>
            </div>
          </div>

          <button
            onClick={() => setShowRegModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#45a29e] to-[#66fcf1] text-[#0b0c10] font-bold shadow-lg shadow-[#66fcf1]/10 hover:shadow-[#66fcf1]/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Register New Customer (5,000 ETB)</span>
          </button>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Stat 1: Total Customers */}
        <div className="bg-[#1f2833]/80 border border-[#45a29e]/20 rounded-2xl p-5 backdrop-blur shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#66fcf1]/5 rounded-full blur-xl group-hover:bg-[#66fcf1]/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Total Licensees</span>
            <div className="p-2.5 rounded-xl bg-[#45a29e]/10 text-[#66fcf1]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{stats.totalCustomers}</div>
          <div className="text-xs text-gray-400 mt-1 font-mono">Registered Game Zones</div>
        </div>

        {/* Stat 2: License Revenue */}
        <div className="bg-[#1f2833]/80 border border-emerald-500/20 rounded-2xl p-5 backdrop-blur shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Platform Revenue</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-300 tracking-tight">
            {stats.totalLicenseRevenue.toLocaleString()} <span className="text-sm font-mono font-normal">ETB</span>
          </div>
          <div className="text-xs text-emerald-400/80 mt-1 font-mono">5,000 ETB / Customer License</div>
        </div>

        {/* Stat 3: Active Status */}
        <div className="bg-[#1f2833]/80 border border-cyan-500/20 rounded-2xl p-5 backdrop-blur shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Active Game Zones</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{stats.activeCustomers}</div>
          <div className="text-xs text-cyan-400/80 mt-1 font-mono">Full Operating Access</div>
        </div>

        {/* Stat 4: Suspended Status */}
        <div className="bg-[#1f2833]/80 border border-rose-500/20 rounded-2xl p-5 backdrop-blur shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400">Suspended</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-200 tracking-tight">{stats.suspendedCustomers}</div>
          <div className="text-xs text-rose-400/80 mt-1 font-mono">Access Locked</div>
        </div>
      </div>

      {/* Customer Licensees Management Section */}
      <div className="max-w-6xl mx-auto bg-[#1f2833]/50 border border-[#45a29e]/20 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl">
        {/* Controls Header: Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Game Zone, Owner, or Username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b0c10] border border-[#1f2833] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#66fcf1] transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-[#66fcf1] text-[#0b0c10]'
                  : 'bg-[#0b0c10] text-gray-400 hover:text-white border border-[#1f2833]'
              }`}
            >
              ALL ({tenants.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-400 text-[#0b0c10]'
                  : 'bg-[#0b0c10] text-gray-400 hover:text-emerald-400 border border-[#1f2833]'
              }`}
            >
              ACTIVE ({stats.activeCustomers})
            </button>
            <button
              onClick={() => setStatusFilter('SUSPENDED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                statusFilter === 'SUSPENDED'
                  ? 'bg-rose-500 text-white'
                  : 'bg-[#0b0c10] text-gray-400 hover:text-rose-400 border border-[#1f2833]'
              }`}
            >
              SUSPENDED ({stats.suspendedCustomers})
            </button>
          </div>
        </div>

        {/* Customer List */}
        {filteredTenants.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#1f2833] rounded-xl bg-[#0b0c10]/40">
            <Building2 className="w-10 h-10 mx-auto text-gray-600 mb-2" />
            <p className="text-gray-400 font-medium">No registered customers found</p>
            <p className="text-xs text-gray-500 mt-1">Register your first Game Zone customer using the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTenants.map((t) => {
              const isEditing = editingTenantId === t.id;
              const isActive = t.status === 'ACTIVE';

              return (
                <div
                  key={t.id}
                  className={`relative p-5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-[#0b0c10]/80 border-[#1f2833] hover:border-[#45a29e]/40'
                      : 'bg-rose-950/10 border-rose-900/40 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-[#1f2833] border border-[#66fcf1] text-white text-sm font-bold focus:outline-none"
                            placeholder="Game Zone Name"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveName(t.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            title="Save Name"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTenantId(null)}
                            className="p-1.5 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h3 className="text-lg font-bold text-white truncate">{t.game_zone_name}</h3>
                          <button
                            onClick={() => {
                              setEditingTenantId(t.id);
                              setEditingName(t.game_zone_name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#66fcf1] transition-all"
                            title="Edit Game Zone Name"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1 font-mono text-[#66fcf1]">
                          <User className="w-3.5 h-3.5" /> @{t.username}
                        </span>
                        {t.owner_contact_name && (
                          <span className="text-gray-400">({t.owner_contact_name})</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-wide ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                      {t.status}
                    </span>
                  </div>

                  {/* Financial & License Details */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#1f2833]/80 text-xs font-mono">
                    <div>
                      <span className="text-gray-500 block">LICENSE FEE</span>
                      <span className="text-emerald-400 font-bold">{t.license_amount?.toLocaleString() || 5000} ETB</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">REGISTERED ON</span>
                      <span className="text-gray-300">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-4 pt-3 border-t border-[#1f2833]/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-500 font-mono">ID: {t.id}</span>

                    <button
                      onClick={() => handleToggleStatus(t)}
                      disabled={isPending}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        isActive
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Suspend Access' : 'Activate Access'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1f2833] border border-[#45a29e]/30 w-full max-w-md rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRegModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-6 h-6 text-[#66fcf1]" />
              <h2 className="text-xl font-extrabold text-white">Register New Customer</h2>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              Create a customer account and password for a new game zone. Standard license is <strong className="text-emerald-400">5,000 ETB</strong>.
            </p>

            {regError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-300 mb-1">
                  Game Zone Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bole Gaming Hub"
                  value={gameZoneName}
                  onChange={(e) => setGameZoneName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0b0c10] border border-[#45a29e]/30 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#66fcf1]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-300 mb-1">
                  Owner / Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Abebe Bekele"
                  value={ownerContact}
                  onChange={(e) => setOwnerContact(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0b0c10] border border-[#45a29e]/30 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#66fcf1]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-300 mb-1">
                  System Username <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bole_gaming"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0b0c10] border border-[#45a29e]/30 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#66fcf1]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-300 mb-1">
                  Initial Login Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Initial password given to customer"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b0c10] border border-[#45a29e]/30 text-white font-mono text-sm focus:outline-none focus:border-[#66fcf1]"
                  />
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Customer can change this password later in Settings.</span>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-gray-300 mb-1">
                  One-time License Fee (ETB)
                </label>
                <input
                  type="number"
                  value={licenseFee}
                  onChange={(e) => setLicenseFee(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0b0c10] border border-[#45a29e]/30 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-[#66fcf1]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0b0c10] text-gray-400 hover:text-white text-sm font-semibold border border-[#1f2833]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#45a29e] to-[#66fcf1] text-[#0b0c10] text-sm font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  {isPending ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
