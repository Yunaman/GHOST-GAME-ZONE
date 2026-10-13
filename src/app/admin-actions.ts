'use server';

import { revalidatePath } from 'next/cache';
import { repository } from '@/lib/repository';

export async function getAdminDataAction() {
  try {
    const stats = await repository.getAdminStats();
    const tenants = await repository.getTenants();
    return { success: true, data: { stats, tenants } };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch admin data' };
  }
}

export async function registerCustomerAction(
  gameZoneName: string,
  ownerContactName: string,
  username: string,
  licenseAmount = 5000
) {
  try {
    if (!gameZoneName || !username) {
      return { success: false, error: 'Game Zone Name and Username are required' };
    }
    const tenant = await repository.registerCustomerTenant(
      gameZoneName.trim(),
      ownerContactName.trim(),
      username.trim(),
      licenseAmount
    );
    revalidatePath('/admin');
    return { success: true, data: tenant };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to register customer' };
  }
}

export async function toggleCustomerStatusAction(tenantId: string, currentStatus: 'ACTIVE' | 'SUSPENDED') {
  try {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const updated = await repository.updateTenantStatus(tenantId, newStatus);
    revalidatePath('/admin');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update customer status' };
  }
}

export async function updateCustomerGameZoneNameAction(tenantId: string, newGameZoneName: string) {
  try {
    if (!newGameZoneName.trim()) {
      return { success: false, error: 'Game Zone Name cannot be empty' };
    }
    const updated = await repository.updateTenantGameZoneName(tenantId, newGameZoneName.trim());
    revalidatePath('/admin');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update Game Zone name' };
  }
}
