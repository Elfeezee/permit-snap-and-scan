import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export interface FirestoreQueryOptions {
  limit?: number;
  orderByField?: string;
  orderByDirection?: 'asc' | 'desc';
  whereConditions?: Array<{ field: string; operator: any; value: any }>;
  startAfterDoc?: any;
}

export class FirestoreService {
  // Create a document with auto-generated ID
  async createDocument(collectionName: string, data: any): Promise<{ id: string; error?: any }> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id };
    } catch (error) {
      return { id: '', error };
    }
  }

  // Create or update a document with specific ID
  async setDocument(collectionName: string, docId: string, data: any): Promise<{ error?: any }> {
    try {
      await setDoc(doc(db, collectionName, docId), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return {};
    } catch (error) {
      return { error };
    }
  }

  // Get a single document
  async getDocument(collectionName: string, docId: string): Promise<{ data: any; error?: any }> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { data: null, error: 'Document not found' };
      }
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get multiple documents with query options
  async getDocuments(collectionName: string, options?: FirestoreQueryOptions): Promise<{ data: any[]; error?: any }> {
    try {
      let q = collection(db, collectionName);
      let queryConstraints: any[] = [];

      // Add where conditions
      if (options?.whereConditions) {
        options.whereConditions.forEach(condition => {
          queryConstraints.push(where(condition.field, condition.operator, condition.value));
        });
      }

      // Add ordering
      if (options?.orderByField) {
        queryConstraints.push(orderBy(options.orderByField, options.orderByDirection || 'asc'));
      }

      // Add limit
      if (options?.limit) {
        queryConstraints.push(limit(options.limit));
      }

      // Add pagination
      if (options?.startAfterDoc) {
        queryConstraints.push(startAfter(options.startAfterDoc));
      }

      const queryRef = query(q, ...queryConstraints);
      const snapshot = await getDocs(queryRef);
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { data: documents };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Update a document
  async updateDocument(collectionName: string, docId: string, updates: any): Promise<{ error?: any }> {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return {};
    } catch (error) {
      return { error };
    }
  }

  // Delete a document
  async deleteDocument(collectionName: string, docId: string): Promise<{ error?: any }> {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      return {};
    } catch (error) {
      return { error };
    }
  }

  // Subscribe to real-time updates for a single document
  subscribeToDocument(
    collectionName: string, 
    docId: string, 
    callback: (data: any) => void
  ) {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    });
  }

  // Subscribe to real-time updates for a collection
  subscribeToCollection(
    collectionName: string,
    callback: (data: any[]) => void,
    options?: FirestoreQueryOptions
  ) {
    let q = collection(db, collectionName);
    let queryConstraints: any[] = [];

    // Add where conditions
    if (options?.whereConditions) {
      options.whereConditions.forEach(condition => {
        queryConstraints.push(where(condition.field, condition.operator, condition.value));
      });
    }

    // Add ordering
    if (options?.orderByField) {
      queryConstraints.push(orderBy(options.orderByField, options.orderByDirection || 'asc'));
    }

    // Add limit
    if (options?.limit) {
      queryConstraints.push(limit(options.limit));
    }

    const queryRef = query(q, ...queryConstraints);
    
    return onSnapshot(queryRef, (snapshot) => {
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(documents);
    });
  }

  // Batch operations
  async batchWrite(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id?: string;
    data?: any;
  }>): Promise<{ error?: any }> {
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      operations.forEach(op => {
        switch (op.type) {
          case 'create':
            if (op.id) {
              const docRef = doc(db, op.collection, op.id);
              batch.set(docRef, {
                ...op.data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }
            break;
          case 'update':
            if (op.id) {
              const docRef = doc(db, op.collection, op.id);
              batch.update(docRef, {
                ...op.data,
                updatedAt: serverTimestamp()
              });
            }
            break;
          case 'delete':
            if (op.id) {
              const docRef = doc(db, op.collection, op.id);
              batch.delete(docRef);
            }
            break;
        }
      });

      await batch.commit();
      return {};
    } catch (error) {
      return { error };
    }
  }
}

export const firestoreService = new FirestoreService();