/**
 * Migration Service - Migrates data from localStorage to SQLite
 */

import { invoke } from '@tauri-apps/api/core';

const LOCAL_STORAGE_KEY = 'anim-jobs';
const MIGRATION_FLAG_KEY = 'migration-completed';

export interface LegacyJob {
  id: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  script?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Check if migration has been completed
 */
export function isMigrationCompleted(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

/**
 * Get legacy jobs from localStorage
 */
function getLegacyJobs(): LegacyJob[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read legacy jobs:', error);
    return [];
  }
}

/**
 * Clear legacy data from localStorage
 */
function clearLegacyData(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear legacy data:', error);
  }
}

/**
 * Migrate a single legacy job to SQLite
 */
async function migrateJob(job: LegacyJob): Promise<boolean> {
  try {
    // Convert legacy job to Project format
    const project = {
      id: job.id,
      title: job.description.slice(0, 50) + (job.description.length > 50 ? '...' : ''),
      description: job.description,
      narration_style: null,
      visual_style: null,
      status: job.status,
      script: job.script || null,
      video_path: null,
      duration: null,
      resolution: null,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    };

    // Use Tauri command to create project
    await invoke('create_project', { app: null, project });
    return true;
  } catch (error) {
    console.error(`Failed to migrate job ${job.id}:`, error);
    return false;
  }
}

/**
 * Run migration from localStorage to SQLite
 */
export async function runMigration(): Promise<{
  success: boolean;
  migrated: number;
  failed: number;
  error?: string;
}> {
  // Check if migration already completed
  if (isMigrationCompleted()) {
    return { success: true, migrated: 0, failed: 0 };
  }

  try {
    // Get legacy jobs
    const legacyJobs = getLegacyJobs();

    if (legacyJobs.length === 0) {
      // No legacy data to migrate, mark as completed
      markMigrationCompleted();
      return { success: true, migrated: 0, failed: 0 };
    }

    console.log(`Starting migration: ${legacyJobs.length} jobs to migrate`);

    let migrated = 0;
    let failed = 0;

    // Migrate each job
    for (const job of legacyJobs) {
      const success = await migrateJob(job);
      if (success) {
        migrated++;
      } else {
        failed++;
      }
    }

    // Clear legacy data after successful migration
    if (migrated > 0 || failed === 0) {
      clearLegacyData();
      markMigrationCompleted();
    }

    console.log(`Migration completed: ${migrated} migrated, ${failed} failed`);

    return {
      success: true,
      migrated,
      failed,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      migrated: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset migration flag (for testing purposes)
 */
export function resetMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_FLAG_KEY);
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  completed: boolean;
  hasLegacyData: boolean;
  legacyJobCount: number;
}> {
  const completed = isMigrationCompleted();
  const legacyJobs = getLegacyJobs();

  return {
    completed,
    hasLegacyData: legacyJobs.length > 0,
    legacyJobCount: legacyJobs.length,
  };
}
