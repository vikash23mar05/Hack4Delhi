
import { supabase } from './supabaseClient';
import { Complaint } from '../types';
import { MOCK_COMPLAINTS } from '../constants';

export async function fetchComplaints(): Promise<Complaint[]> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      return data.map(record => ({
        id: record.id,
        type: record.type,
        location: record.location,
        ward: record.ward,
        timestamp: record.timestamp,
        status: record.status,
        intensity: record.intensity,
        responsibleDept: record.responsible_dept,
        slaRemaining: record.sla_remaining,
        reporter: record.reporter_user_id ? {
          userId: record.reporter_user_id,
          authMethod: record.auth_method || 'Unknown',
          trustScore: record.trust_score ?? 0.5,
        } : undefined,
        coordinates: record.lat && record.lng
          ? { lat: record.lat, lng: record.lng }
          : undefined,
        evidence: record.evidence_files ?? [],
        aqiAtSubmission: record.aqi_at_submission ?? undefined,
        integrityHash: record.integrity_hash ?? undefined,
      }));
    }
  } catch (err) {
    console.warn('Supabase complaints fetch failed, using mock data', err);
  }

  return MOCK_COMPLAINTS;
}

export interface ComplaintPayload {
  type: Complaint['type'];
  location: string;
  ward: string;
  intensity: Complaint['intensity'];
  description?: string;
  // ── Credibility fields ──
  reporter?: {
    userId: string;
    authMethod: string;
    trustScore: number;
  };
  coordinates?: { lat: number; lng: number };
  evidence?: string[];         // filenames or base64 keys
  aqiAtSubmission?: number;
  integrityHash?: string;
}

/** Generate a SHA-256-style hash for data integrity (client-side simulation) */
async function generateIntegrityHash(payload: object): Promise<string> {
  try {
    const str = JSON.stringify(payload);
    const buffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(str)
    );
    const hex = Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256:${hex}`;
  } catch {
    // Fallback for environments without SubtleCrypto
    return `sha256:${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export async function submitComplaint(payload: ComplaintPayload): Promise<{ ok: boolean; id?: string; hash?: string }> {
  const timestamp = new Date().toISOString();

  // Generate integrity hash over the core evidence fields
  const hashInput = {
    type: payload.type,
    location: payload.location,
    ward: payload.ward,
    timestamp,
    reporter: payload.reporter?.userId,
    coordinates: payload.coordinates,
    aqiAtSubmission: payload.aqiAtSubmission,
  };
  const integrityHash = payload.integrityHash ?? await generateIntegrityHash(hashInput);

  // ── Phase 1: Full insert with all credibility fields ──────────────────────
  const fullRecord = {
    type: payload.type,
    location: payload.location,
    ward: payload.ward,
    timestamp,
    status: 'Reported',
    intensity: payload.intensity,
    responsible_dept: detectDepartment(payload.type),
    sla_remaining: '24h',
    reporter_user_id: payload.reporter?.userId ?? null,
    auth_method: payload.reporter?.authMethod ?? null,
    trust_score: payload.reporter?.trustScore ?? null,
    lat: payload.coordinates?.lat ?? null,
    lng: payload.coordinates?.lng ?? null,
    evidence_files: payload.evidence ?? [],
    aqi_at_submission: payload.aqiAtSubmission ?? null,
    integrity_hash: integrityHash,
  };

  try {
    const { data, error } = await supabase
      .from('complaints')
      .insert([fullRecord])
      .select('id')
      .single();

    if (!error) {
      return { ok: true, id: data?.id, hash: integrityHash };
    }

    // ── Phase 2: Fallback — try basic insert (missing columns on DB) ─────────
    console.warn('Full insert failed (credibility columns may not exist yet). Trying basic insert...', error.message);

    const basicRecord = {
      type: payload.type,
      location: payload.location,
      ward: payload.ward,
      timestamp,
      status: 'Reported',
      intensity: payload.intensity,
      responsible_dept: detectDepartment(payload.type),
      sla_remaining: '24h',
    };

    const { data: data2, error: error2 } = await supabase
      .from('complaints')
      .insert([basicRecord])
      .select('id')
      .single();

    if (!error2) {
      // Basic insert worked — note that credibility fields weren't saved
      console.info('Basic insert succeeded. Run the migration SQL to enable credibility field storage.');
      return { ok: true, id: data2?.id, hash: integrityHash };
    }

    throw error2;
  } catch (err) {
    console.error('Failed to submit complaint to Supabase', err);
    return { ok: false, hash: integrityHash };
  }
}

function detectDepartment(type: Complaint['type']): string {
  if (type === 'Waste Burning') return 'Fire & Sanitation (MCD)';
  if (type === 'Construction Dust') return 'MCD Dust Squad';
  if (type === 'Industrial Violation') return 'DPCC Taskforce';
  return 'MCD Central';
}

export async function updateComplaintStatus(
  id: string,
  status: Complaint['status']
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('complaints')
      .update({ status, sla_remaining: status === 'Resolved' ? 'Resolved' : undefined })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to update complaint status in Supabase', err);
    return false;
  }
}
