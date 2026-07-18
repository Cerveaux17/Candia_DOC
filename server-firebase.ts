import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = null;

try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('🔥 Server-side Firebase admin config loaded successfully.');
  } else {
    console.warn('⚠️ firebase-applet-config.json not found on server.');
  }
} catch (e) {
  console.error('❌ Error reading firebase-applet-config.json:', e);
}

let db: any = null;

if (firebaseConfig) {
  try {
    let app;
    const apps = getApps();
    if (apps.length === 0) {
      app = initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      app = apps[0]!;
    }
    
    if (firebaseConfig.firestoreDatabaseId) {
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
    console.log('🔥 Firebase Admin initialized successfully on server-side.');
  } catch (e) {
    console.error('❌ Failed to initialize Firebase Admin on server-side:', e);
  }
}

/**
 * Sync entire database from Firestore to local db.json
 * If Firestore is empty, we seed it with the default DB
 */
export async function syncFromFirestore(defaultDb: any): Promise<any> {
  if (!db) {
    console.log('⚠️ Firestore not initialized. Using local storage only.');
    return null;
  }

  try {
    console.log('🔄 Syncing data FROM Cloud Firestore...');
    const collections = ['users', 'documents', 'offers', 'dossiers', 'activityLogs'];
    const loadedData: any = {
      users: [],
      documents: [],
      offers: [],
      dossiers: [],
      activityLogs: []
    };

    let hasDataInFirestore = false;
    let anyCollectionFailed = false;

    for (const colName of collections) {
      try {
        const querySnapshot = await db.collection(colName).get();
        querySnapshot.forEach((docSnap: any) => {
          loadedData[colName].push({
            id: docSnap.id,
            ...docSnap.data()
          });
          hasDataInFirestore = true;
        });
      } catch (e) {
        console.error(`Error loading collection ${colName} from Firestore:`, e);
        anyCollectionFailed = true;
      }
    }

    if (anyCollectionFailed) {
      console.warn('⚠️ Some Firestore collections failed to load. Skipping sync to prevent overwriting or corrupting local DB.');
      return null;
    }

    if (!hasDataInFirestore) {
      console.log('🌱 Firestore is empty. Seeding with default data...');
      await seedFirestore(defaultDb);
      return defaultDb;
    }

    console.log(`✅ Successfully synced ${loadedData.users.length} users, ${loadedData.dossiers.length} dossiers from Firestore.`);
    return loadedData;
  } catch (error) {
    console.error('❌ Error syncing from Firestore:', error);
    return null;
  }
}

/**
 * Seed Firestore with initial/default database
 */
async function seedFirestore(defaultDb: any) {
  if (!db) return;
  try {
    const collections = ['users', 'documents', 'offers', 'dossiers', 'activityLogs'];
    for (const colName of collections) {
      const items = defaultDb[colName] || [];
      console.log(`Seed collection: ${colName} with ${items.length} items.`);
      
      // Batch write to avoid individual requests
      const batch = db.batch();
      let batchCount = 0;

      for (const item of items) {
        if (!item.id) continue;
        const itemCopy = { ...item };
        delete itemCopy.id; // Store id as document ID, not field if redundant (or keep it)
        const docRef = db.collection(colName).doc(item.id);
        batch.set(docRef, itemCopy);
        batchCount++;

        if (batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      }
      if (batchCount > 0) {
        await batch.commit();
      }
    }
    console.log('✅ Firestore seeding completed.');
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
  }
}

/**
 * Save / Update a single entity in Firestore
 */
export async function saveEntityToFirestore(collectionName: string, id: string, data: any) {
  if (!db) return;
  try {
    const dataCopy = { ...data };
    // Remove ID from payload to avoid redundancy (stored as document key)
    if (dataCopy.id) {
      delete dataCopy.id;
    }
    await db.collection(collectionName).doc(id).set(dataCopy, { merge: true });
  } catch (error) {
    console.error(`❌ Error saving ${collectionName}/${id} to Firestore:`, error);
  }
}

/**
 * Delete an entity from Firestore
 */
export async function deleteEntityFromFirestore(collectionName: string, id: string) {
  if (!db) return;
  try {
    await db.collection(collectionName).doc(id).delete();
  } catch (error) {
    console.error(`❌ Error deleting ${collectionName}/${id} from Firestore:`, error);
  }
}

/**
 * Purge mock/fictional data from Firestore
 */
export async function purgeMockDataFromFirestore(): Promise<void> {
  if (!db) return;
  try {
    console.log('🧹 Purging mock data from Cloud Firestore...');
    const mockUsers = ['user_default', 'user_1', 'user_2', 'user_3', 'user_4', 'user_5', 'user_6', 'user_7'];
    for (const uid of mockUsers) {
      await db.collection('users').doc(uid).delete();
    }
    
    const mockDossiers = ['dossier_1'];
    for (const did of mockDossiers) {
      await db.collection('dossiers').doc(did).delete();
    }

    const mockLogs = ['log_1', 'log_2', 'log_3', 'log_4', 'log_5', 'log_6', 'log_7'];
    for (const lid of mockLogs) {
      await db.collection('activityLogs').doc(lid).delete();
    }
    
    console.log('✅ Cleaned mock entries from Firestore collections.');
  } catch (error) {
    console.error('❌ Error purging mock data from Firestore:', error);
  }
}

