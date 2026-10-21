'use server';

import { revalidatePath } from 'next/cache';
import { getAuthUser, hashPassword } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/db/supabase';
import { loadDb, saveDb } from '@/lib/db/fs-db';
import { Tenant } from '@/types';
import { cryptoRandomUUID } from '@/lib/utils';

async function verifyOwnerAccess() {
  const user = await getAuthUser();
  if (!user || user.role !== 'OWNER') {
    throw new Error('Unauthorized: Product owner access required');
  }
  return user;
}

export async function getAdminOverviewAction() {
  try {
    await verifyOwnerAccess();

    let tenants: Tenant[] = [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, owner_name, username, license_price, payment_status, account_status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      tenants = (data || []).map((t) => ({
        ...t,
        license_price: Number(t.license_price),
      }));
    } else {
      const db = loadDb();
      tenants = ((db as any).tenants || []).map((t: any) => {
        const { password_hash, ...safeTenant } = t;
        return safeTenant;
      });
    }

    const totalCount = tenants.length;
    const activeCount = tenants.filter((t) => t.account_status === 'ACTIVE').length;
    const suspendedCount = tenants.filter((t) => t.account_status === 'SUSPENDED').length;
    const paidCount = tenants.filter((t) => t.payment_status === 'PAID').length;
    const pendingCount = tenants.filter((t) => t.payment_status === 'PENDING').length;
    const totalSales = tenants
      .filter((t) => t.payment_status === 'PAID')
      .reduce((sum, t) => sum + (t.license_price || 5000), 0);

    return {
      success: true,
      data: {
        totalCount,
        activeCount,
        suspendedCount,
        paidCount,
        pendingCount,
        totalSales,
        tenants,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch admin overview' };
  }
}

export async function registerCustomerAction(data: {
  name: string;
  owner_name: string;
  username: string;
  password: string;
  license_price?: number;
  payment_status: 'PAID' | 'PENDING';
  account_status: 'ACTIVE' | 'SUSPENDED';
}) {
  try {
    await verifyOwnerAccess();

    const tenantId = `t-${cryptoRandomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const licensePrice = data.license_price && data.license_price > 0 ? data.license_price : 5000.00;
    const hashedPassword = hashPassword(data.password);

    if (isSupabaseConfigured && supabase) {
      // 1. Create Tenant Record
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          id: tenantId,
          name: data.name,
          owner_name: data.owner_name,
          username: data.username,
          password_hash: hashedPassword,
          license_price: licensePrice,
          payment_status: data.payment_status,
          account_status: data.account_status,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (tenantErr || !tenant) {
        throw new Error(tenantErr?.message || 'Failed to create tenant account');
      }

      // 2. Create User Record
      await supabase.from('users').insert({
        id: `u-${tenantId}`,
        tenant_id: tenantId,
        username: data.username,
        display_name: data.name,
        role: 'CUSTOMER',
        created_at: now,
      });

      // 3. Seed Initial 3 Consoles (TV 1, TV 2, TV 3)
      await supabase.from('consoles').insert([
        { id: `c-${tenantId}-1`, tenant_id: tenantId, name: 'TV 1', status: 'AVAILABLE', display_order: 1, is_active: true, created_at: now },
        { id: `c-${tenantId}-2`, tenant_id: tenantId, name: 'TV 2', status: 'AVAILABLE', display_order: 2, is_active: true, created_at: now },
        { id: `c-${tenantId}-3`, tenant_id: tenantId, name: 'TV 3', status: 'AVAILABLE', display_order: 3, is_active: true, created_at: now },
      ]);

      // 4. Seed Initial Tenant Settings
      await supabase.from('settings').insert({
        id: `s-${tenantId}`,
        tenant_id: tenantId,
        fifa_normal_price: 15.00,
        fifa_extra_time_price: 5.00,
        currency: 'ETB',
        updated_at: now,
      });
    } else {
      const db = loadDb();
      if (!(db as any).tenants) (db as any).tenants = [];

      const newTenant: Tenant = {
        id: tenantId,
        name: data.name,
        owner_name: data.owner_name,
        username: data.username,
        license_price: licensePrice,
        payment_status: data.payment_status,
        account_status: data.account_status,
        created_at: now,
        updated_at: now,
      };

      (newTenant as any).password_hash = hashedPassword;
      (db as any).tenants.push(newTenant);

      db.users.push({
        id: `u-${tenantId}`,
        tenant_id: tenantId,
        username: data.username,
        display_name: data.name,
        role: 'CUSTOMER',
        created_at: now,
      });

      db.consoles.push(
        { id: `c-${tenantId}-1`, tenant_id: tenantId, name: 'TV 1', status: 'AVAILABLE', display_order: 1, is_active: true, created_at: now },
        { id: `c-${tenantId}-2`, tenant_id: tenantId, name: 'TV 2', status: 'AVAILABLE', display_order: 2, is_active: true, created_at: now },
        { id: `c-${tenantId}-3`, tenant_id: tenantId, name: 'TV 3', status: 'AVAILABLE', display_order: 3, is_active: true, created_at: now }
      );

      saveDb(db);
    }

    revalidatePath('/admin');
    return { success: true, tenantId };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to register customer' };
  }
}

export async function updateCustomerAction(tenantId: string, data: {
  name: string;
  owner_name: string;
  payment_status: 'PAID' | 'PENDING';
  account_status: 'ACTIVE' | 'SUSPENDED';
}) {
  try {
    await verifyOwnerAccess();

    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: data.name,
          owner_name: data.owner_name,
          payment_status: data.payment_status,
          account_status: data.account_status,
          updated_at: now,
        })
        .eq('id', tenantId);

      if (error) throw new Error(error.message);
    } else {
      const db = loadDb();
      const tenant = ((db as any).tenants || []).find((t: any) => t.id === tenantId);
      if (!tenant) throw new Error('Tenant not found');

      tenant.name = data.name;
      tenant.owner_name = data.owner_name;
      tenant.payment_status = data.payment_status;
      tenant.account_status = data.account_status;
      tenant.updated_at = now;
      saveDb(db);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update customer' };
  }
}

export async function resetCustomerPasswordAction(tenantId: string, newPassword: string) {
  try {
    await verifyOwnerAccess();

    const now = new Date().toISOString();
    const hashedPassword = hashPassword(newPassword);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('tenants')
        .update({
          password_hash: hashedPassword,
          updated_at: now,
        })
        .eq('id', tenantId);

      if (error) throw new Error(error.message);
    } else {
      const db = loadDb();
      const tenant = ((db as any).tenants || []).find((t: any) => t.id === tenantId);
      if (!tenant) throw new Error('Tenant not found');

      tenant.password_hash = hashedPassword;
      tenant.updated_at = now;
      saveDb(db);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to reset password' };
  }
}
