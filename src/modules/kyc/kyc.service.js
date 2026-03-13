import {
  createKycRequest,
  findKycRequestByUserUuid,
  // Removed: findKycRequestByKycRequestUuid,
  updateKycRequestStatus,
  getAllKycRequests
} from '../../database/models/kyc_request.model.js';

export async function submitKycRequest(
  userUuid,
  documentType,
  documentNumber,
  documentFrontUrl,
  documentBackUrl,
  selfieUrl
) {
  // 🔎 1️⃣ Vérifier si une demande KYC est déjà en attente pour ce userUuid
  const existingRequest = await findKycRequestByUserUuid(userUuid);

  if (existingRequest && existingRequest.status === 'pending') {
    throw new Error('A pending KYC request already exists for this user.');
  }

  // 📝 2️⃣ Créer la demande KYC
  const kycRequest = {
    user_uuid: userUuid,                  // On reste sur user_uuid
    document_type: documentType,
    document_number: documentNumber,
    document_front_url: documentFrontUrl,
    document_back_url: documentBackUrl ?? null, // jamais undefined
    selfie_url: selfieUrl,
    status: 'pending'
  };

  return createKycRequest(kycRequest);
}

// 🔎 récupérer KYC pour un utilisateur
export async function getKycRequestForUser(userUuid) {
  return findKycRequestByUserUuid(userUuid);
}

// 🔎 détails d'une demande KYC
export async function getKycRequestDetails(userUuid) {
  return findKycRequestByUserUuid(userUuid);
}

// 🔎 approuver une demande
export async function approveKycRequest(userUuid, reviewedBy) {
  const kycRequest = await findKycRequestByUserUuid(userUuid); // Find latest request for user
  console.log(`[approveKycRequest] Fetched kycRequest for userUuid ${userUuid}:`, kycRequest); // Add this line
  if (!kycRequest) {
    throw new Error('No KYC request found for this user.');
  }
  if (kycRequest.status.toLowerCase() !== 'pending') {
    throw new Error('Only pending KYC requests can be approved.');
  }
  return updateKycRequestStatus(kycRequest.id, 'approved', reviewedBy ?? null, 'Approved by admin');
}

// 🔎 rejeter une demande
export async function rejectKycRequest(userUuid, reviewedBy, reviewComment) {
  const kycRequest = await findKycRequestByUserUuid(userUuid); // Find latest request for user
  console.log(`[rejectKycRequest] Fetched kycRequest for userUuid ${userUuid}:`, kycRequest); // Add this line
  if (!kycRequest) {
    throw new Error('No KYC request found for this user.');
  }
  if (kycRequest.status.toLowerCase() !== 'pending') {
    throw new Error('Only pending KYC requests can be rejected.');
  }
  if (!reviewComment) {
    throw new Error('Review comment is required for rejecting a KYC request.');
  }
  return updateKycRequestStatus(kycRequest.id, 'rejected', reviewedBy ?? null, reviewComment ?? null);
}

// 🔎 récupérer toutes les demandes KYC
export async function fetchAllKycRequests() {
  return getAllKycRequests();
}
