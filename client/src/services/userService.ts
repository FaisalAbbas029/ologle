/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth } from './firebase.ts';
import { db, handleFirestoreError, OperationType } from './firestoreDb.ts';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  profession: string;
  interests: string[];
  isHumanVerified: boolean;
  trustScore: number;
  firewallPassedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  action: string;
  status: 'allowed' | 'blocked' | 'challenged' | 'passed';
  details?: string;
  timestamp: string;
}

export interface FirewallMetrics {
  id: string;
  totalBotChallenges: number;
  botsBlocked: number;
  verifiedHumans: number;
  lastShieldCheck: string;
}

/**
 * Fetch a user profile from Firestore
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

/**
 * Save or update user profile in Firestore
 */
export async function syncUserProfile(profile: Partial<UserProfile> & { uid: string; email: string }): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const docRef = doc(db, 'users', profile.uid);
    const existingSnap = await getDoc(docRef);

    const now = new Date().toISOString();
    if (!existingSnap.exists()) {
      const newDoc: UserProfile = {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName || profile.email.split('@')[0],
        photoURL: profile.photoURL || '',
        profession: profile.profession || '',
        interests: profile.interests || [],
        isHumanVerified: profile.isHumanVerified ?? true,
        trustScore: profile.trustScore ?? 100,
        firewallPassedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(docRef, newDoc);
    } else {
      const updatePayload: Record<string, any> = {
        updatedAt: now,
      };
      if (profile.displayName !== undefined) updatePayload.displayName = profile.displayName;
      if (profile.photoURL !== undefined) updatePayload.photoURL = profile.photoURL;
      if (profile.profession !== undefined) updatePayload.profession = profile.profession;
      if (profile.interests !== undefined) updatePayload.interests = profile.interests;
      if (profile.isHumanVerified !== undefined) updatePayload.isHumanVerified = profile.isHumanVerified;
      if (profile.trustScore !== undefined) updatePayload.trustScore = profile.trustScore;
      if (profile.firewallPassedAt !== undefined) updatePayload.firewallPassedAt = profile.firewallPassedAt;

      await updateDoc(docRef, updatePayload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Record a bot challenge or firewall audit event in Firestore
 */
export async function logSecurityEvent(
  userId: string,
  action: string,
  status: 'allowed' | 'blocked' | 'challenged' | 'passed',
  details?: string
): Promise<void> {
  const path = `users/${userId}/securityLogs`;
  try {
    const colRef = collection(db, 'users', userId, 'securityLogs');
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const logData: SecurityAuditLog = {
      id: logId,
      userId,
      action,
      status,
      details: details || '',
      timestamp: new Date().toISOString(),
    };
    await addDoc(colRef, logData);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Fetch recent security logs for the user
 */
export async function fetchUserSecurityLogs(userId: string): Promise<SecurityAuditLog[]> {
  const path = `users/${userId}/securityLogs`;
  try {
    const colRef = collection(db, 'users', userId, 'securityLogs');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(15));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SecurityAuditLog);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

/**
 * Update global firewall statistics
 */
export async function updateFirewallStats(blockedDelta = 0, verifiedDelta = 0): Promise<void> {
  const path = 'firewallMetrics/global';
  try {
    const docRef = doc(db, 'firewallMetrics', 'global');
    const snap = await getDoc(docRef);
    const now = new Date().toISOString();
    if (!snap.exists()) {
      await setDoc(docRef, {
        id: 'global',
        totalBotChallenges: Math.max(1, blockedDelta + verifiedDelta),
        botsBlocked: Math.max(0, blockedDelta),
        verifiedHumans: Math.max(0, verifiedDelta),
        lastShieldCheck: now,
      });
    } else {
      const data = snap.data() as FirewallMetrics;
      await updateDoc(docRef, {
        totalBotChallenges: (data.totalBotChallenges || 0) + blockedDelta + verifiedDelta,
        botsBlocked: (data.botsBlocked || 0) + blockedDelta,
        verifiedHumans: (data.verifiedHumans || 0) + verifiedDelta,
        lastShieldCheck: now,
      });
    }
  } catch (err) {
    // Non-blocking telemetry
    console.warn('Firewall metrics update failed:', err);
  }
}

/**
 * Fetch global firewall stats
 */
export async function fetchFirewallStats(): Promise<FirewallMetrics | null> {
  try {
    const docRef = doc(db, 'firewallMetrics', 'global');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as FirewallMetrics;
  } catch {
    return null;
  }
}
