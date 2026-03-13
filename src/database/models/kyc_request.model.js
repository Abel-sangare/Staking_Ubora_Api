import { db } from '../../config/database.js';

export async function createKycRequest(kycRequest) {
  const sql = `
    INSERT INTO kyc_requests (user_uuid, document_type, document_number, document_front_url, document_back_url, selfie_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await db.execute(sql, [
    kycRequest.user_uuid,
    kycRequest.document_type,
    kycRequest.document_number,
    kycRequest.document_front_url,
    kycRequest.document_back_url ?? null,
    kycRequest.selfie_url,
    kycRequest.status ?? 'pending'
  ]);
  return result.insertId;
}

export async function findKycRequestByUserUuid(userUuid) {
  const sql = `SELECT * FROM kyc_requests WHERE user_uuid = ? ORDER BY created_at DESC LIMIT 1`;
  const [rows] = await db.execute(sql, [userUuid]);
  return rows[0];
}



export async function updateKycRequestStatus(id, status, reviewedBy = null, reviewComment = null) {
  const sql = `
    UPDATE kyc_requests
    SET status = ?, reviewed_by = ?, review_comment = ?, reviewed_at = NOW()
    WHERE id = ?
  `;
  const [result] = await db.execute(sql, [status, reviewedBy, reviewComment, id]);
  return result.affectedRows;
}

export async function getAllKycRequests() {
  const sql = `SELECT * FROM kyc_requests ORDER BY created_at DESC`;
  const [rows] = await db.execute(sql);
  return rows;
}
