import { getPool } from '../database';
import { logger } from '../utils/Logger';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '../../../data/backups');
const MAX_BACKUPS = 7;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export async function createBackup(): Promise<string> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `database_backup_${timestamp}.sql`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'skillmap';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';

  const env = { ...process.env, PGPASSWORD: dbPassword };

  try {
    const { stdout, stderr } = await execAsync(
      `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p -f "${backupPath}"`,
      { env }
    );

    logger.info(`数据库备份完成: ${backupFilename}`);
    cleanupOldBackups();
    return backupPath;
  } catch (error) {
    logger.error('数据库备份失败:', error);
    throw error;
  }
}

function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('database_backup_') && f.endsWith('.sql'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > MAX_BACKUPS) {
    const filesToDelete = files.slice(MAX_BACKUPS);
    for (const file of filesToDelete) {
      fs.unlinkSync(file.path);
      logger.info(`删除旧备份: ${file.name}`);
    }
  }
}

export async function cleanupStaleTasks(maxAgeHours: number = 24) {
  const pool = getPool();
  const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  const result = await pool.query(`
    UPDATE tasks
    SET status = 'failed',
        error = '任务超时，请重试',
        updated_at = NOW()
    WHERE status IN ('in_progress', 'queued')
      AND updated_at < $1
  `, [cutoffTime]);

  if ((result.rowCount ?? 0) > 0) {
    logger.info(`清理了 ${result.rowCount} 个僵尸任务`);
  }
}

export function startScheduledTasks() {
  const backupInterval = 24 * 60 * 60 * 1000;
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 2) {
      createBackup().catch(err => logger.error('定时备份失败:', err));
      cleanupStaleTasks(24).catch(err => logger.error('清理僵尸任务失败:', err));
    }
  }, backupInterval);

  setInterval(() => {
    cleanupStaleTasks(24).catch(err => logger.error('清理僵尸任务失败:', err));
  }, 60 * 60 * 1000);

  logger.info('定时任务已启动：每日备份 + 僵尸任务清理');
}

export function listBackups(): Array<{ name: string; size: number; time: Date }> {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('database_backup_') && f.endsWith('.sql'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        name: f,
        size: stat.size,
        time: stat.mtime
      };
    })
    .sort((a, b) => b.time.getTime() - a.time.getTime());

  return files;
}
