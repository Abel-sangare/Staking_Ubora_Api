import crypto from 'crypto';
import { db } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function createAuditLog({
  event_type,
  actor_uuid,
  actor_role,
  entity_type,
  entity_uuid,
  old_value,
  new_value,
  ip_address,
  user_agent
}) {
  const [last] = await db.query(
    'SELECT hash FROM audit_logs ORDER BY id DESC LIMIT 1'
  );

  const previousHash = last[0]?.hash || 'GENESIS';

  const payload = JSON.stringify({
    event_type,
    actor_uuid,
    entity_type,
    entity_uuid,
    old_value,
    new_value
  });

  const hash = crypto
    .createHash('sha256')
    .update(previousHash + payload)
    .digest('hex');

  await db.query(
    `INSERT INTO audit_logs
    (uuid, event_type, actor_uuid, actor_role, entity_type, entity_uuid,
     old_value, new_value, ip_address, user_agent, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      event_type,
      actor_uuid,
      actor_role,
      entity_type,
      entity_uuid,
      JSON.stringify(old_value),
      JSON.stringify(new_value),
      ip_address,
      user_agent,
      hash
    ]
  );
}

/**
 * Récupérer les logs d'audit avec filtres optionnels
 */
export async function getAuditLogs(filters = {}) {
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (filters.event_type) {
    query += ' AND event_type = ?';
    params.push(filters.event_type);
  }

  if (filters.actor_uuid) {
    query += ' AND actor_uuid = ?';
    params.push(filters.actor_uuid);
  }

  if (filters.entity_type) {
    query += ' AND entity_type = ?';
    params.push(filters.entity_type);
  }

  query += ' ORDER BY created_at DESC LIMIT 500';

  const [logs] = await db.query(query, params);
  return logs;
}

/**
 * Exporter les logs d'audit au format JSON ou CSV
 */
export async function exportAuditLogs(format = 'json') {
  const [logs] = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `audit_logs_${timestamp}.${format === 'csv' ? 'csv' : 'json'}`;
  const filepath = path.join('/tmp', filename);

  if (format === 'json') {
    fs.writeFileSync(filepath, JSON.stringify(logs, null, 2));
  } else if (format === 'csv') {
    const headers = Object.keys(logs[0] || {}).join(',');
    const rows = logs.map(log =>
      Object.values(log)
        .map(val => `"${val}"`)
        .join(',')
    );
    fs.writeFileSync(filepath, [headers, ...rows].join('\n'));
  }

  return filepath;
}