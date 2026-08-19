import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  writeBatch,
  Unsubscribe,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ActivityEntity, UserSettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Subscribe to real-time activities for a user
export function subscribeToUserActivities(
  userId: string,
  onNext: (activities: ActivityEntity[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/activities`;
  try {
    const colRef = collection(db, 'users', userId, 'activities');
    const q = query(colRef, orderBy('dateMillis', 'desc'));
    
    return onSnapshot(
      q,
      (snapshot) => {
        const activities: ActivityEntity[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          activities.push({
            id: Number(data.id) || docSnap.id as any,
            stravaActivityId: data.stravaActivityId || null,
            dateMillis: Number(data.dateMillis),
            name: data.name || 'Workout',
            type: data.type || 'Ride',
            movingTimeSec: Number(data.movingTimeSec) || 0,
            elapsedTimeSec: Number(data.elapsedTimeSec) || 0,
            distanceMeters: Number(data.distanceMeters) || 0,
            elevationGainMeters: Number(data.elevationGainMeters) || 0,
            avgWatts: data.avgWatts != null ? Number(data.avgWatts) : null,
            maxWatts: data.maxWatts != null ? Number(data.maxWatts) : null,
            weightedWatts: data.weightedWatts != null ? Number(data.weightedWatts) : null,
            avgHr: data.avgHr != null ? Number(data.avgHr) : null,
            maxHr: data.maxHr != null ? Number(data.maxHr) : null,
            kilojoules: data.kilojoules != null ? Number(data.kilojoules) : null,
            stravaTss: data.stravaTss != null ? Number(data.stravaTss) : null,
            isPlanned: Boolean(data.isPlanned),
            notes: data.notes || null,
          });
        });
        onNext(activities);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

// Subscribe to real-time user settings
export function subscribeToUserSettings(
  userId: string,
  onNext: (settings: UserSettings | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/settings/user_settings`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'user_settings');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onNext(docSnap.data() as UserSettings);
        } else {
          onNext(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

// Save single activity
export async function saveActivityToFirestore(userId: string, activity: ActivityEntity): Promise<void> {
  const docId = String(activity.id);
  const path = `users/${userId}/activities/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, 'activities', docId);
    const payload = {
      id: String(activity.id),
      stravaActivityId: activity.stravaActivityId || null,
      dateMillis: activity.dateMillis,
      name: activity.name || 'Workout',
      type: activity.type || 'Ride',
      movingTimeSec: activity.movingTimeSec,
      elapsedTimeSec: activity.elapsedTimeSec,
      distanceMeters: activity.distanceMeters,
      elevationGainMeters: activity.elevationGainMeters,
      avgWatts: activity.avgWatts ?? null,
      maxWatts: activity.maxWatts ?? null,
      weightedWatts: activity.weightedWatts ?? null,
      avgHr: activity.avgHr ?? null,
      maxHr: activity.maxHr ?? null,
      kilojoules: activity.kilojoules ?? null,
      stravaTss: activity.stravaTss ?? null,
      isPlanned: activity.isPlanned,
      notes: activity.notes || null,
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Save multiple activities (Batch write)
export async function saveBatchActivitiesToFirestore(userId: string, activities: ActivityEntity[]): Promise<void> {
  const path = `users/${userId}/activities`;
  try {
    // Firestore batches allow max 500 operations per batch
    const BATCH_SIZE = 400;
    for (let i = 0; i < activities.length; i += BATCH_SIZE) {
      const chunk = activities.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((activity) => {
        const docId = String(activity.id);
        const docRef = doc(db, 'users', userId, 'activities', docId);
        const payload = {
          id: String(activity.id),
          stravaActivityId: activity.stravaActivityId || null,
          dateMillis: activity.dateMillis,
          name: activity.name || 'Workout',
          type: activity.type || 'Ride',
          movingTimeSec: activity.movingTimeSec,
          elapsedTimeSec: activity.elapsedTimeSec,
          distanceMeters: activity.distanceMeters,
          elevationGainMeters: activity.elevationGainMeters,
          avgWatts: activity.avgWatts ?? null,
          maxWatts: activity.maxWatts ?? null,
          weightedWatts: activity.weightedWatts ?? null,
          avgHr: activity.avgHr ?? null,
          maxHr: activity.maxHr ?? null,
          kilojoules: activity.kilojoules ?? null,
          stravaTss: activity.stravaTss ?? null,
          isPlanned: activity.isPlanned,
          notes: activity.notes || null,
        };
        batch.set(docRef, payload, { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete single activity
export async function deleteActivityFromFirestore(userId: string, activityId: number | string): Promise<void> {
  const docId = String(activityId);
  const path = `users/${userId}/activities/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, 'activities', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Clear all activities for user
export async function clearAllActivitiesFromFirestore(userId: string, activities: ActivityEntity[]): Promise<void> {
  const path = `users/${userId}/activities`;
  try {
    const BATCH_SIZE = 400;
    for (let i = 0; i < activities.length; i += BATCH_SIZE) {
      const chunk = activities.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((act) => {
        const docRef = doc(db, 'users', userId, 'activities', String(act.id));
        batch.delete(docRef);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save User Settings
export async function saveUserSettingsToFirestore(userId: string, settings: UserSettings): Promise<void> {
  const path = `users/${userId}/settings/user_settings`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'user_settings');
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
