import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '@/integrations/firebase/config';
import { FirebaseDocumentRecord } from '@/integrations/firebase/types';

export class FirebaseDocumentService {
  private documentsCollection = collection(db, 'documents');

  // Generate a new KASUPDA permit ID (similar to Supabase function)
  async generateKasupdaPermitId(): Promise<{ data: string | null; error: any }> {
    try {
      // Query existing documents to get the highest number
      const q = query(
        this.documentsCollection,
        orderBy('id', 'desc')
      );
      const snapshot = await getDocs(q);
      
      let nextNumber = 1;
      for (const doc of snapshot.docs) {
        const id = doc.id;
        if (id.startsWith('KASUPDA-PERMIT-')) {
          const numberPart = id.split('KASUPDA-PERMIT-')[1]?.split('-')[0];
          if (numberPart) {
            const currentNumber = parseInt(numberPart, 10);
            if (!isNaN(currentNumber)) {
              nextNumber = currentNumber + 1;
              break;
            }
          }
        }
      }
      
      const newId = `KASUPDA-PERMIT-${nextNumber.toString().padStart(3, '0')}`;
      return { data: newId, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Create a new document record
  async createDocument(data: {
    name: string;
    sizeMb: number;
    userId?: string;
    originalFilePath?: string;
  }): Promise<{ data: FirebaseDocumentRecord | null; error: any }> {
    try {
      // Generate custom ID
      const { data: customId, error: idError } = await this.generateKasupdaPermitId();
      if (idError || !customId) {
        return { data: null, error: idError || new Error('Failed to generate ID') };
      }

      const now = Timestamp.now();
      const docData = {
        id: customId,
        name: data.name,
        sizeMb: data.sizeMb,
        userId: data.userId,
        originalFilePath: data.originalFilePath,
        status: 'uploaded' as const,
        uploadDate: now,
        createdAt: now,
        updatedAt: now
      };

      // Create document with custom ID
      const docRef = doc(this.documentsCollection, customId);
      await updateDoc(docRef, docData);
      
      return { data: docData as FirebaseDocumentRecord, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get all documents for current user
  async getDocuments(userId?: string): Promise<{ data: FirebaseDocumentRecord[] | null; error: any }> {
    try {
      let q = query(this.documentsCollection, orderBy('createdAt', 'desc'));
      
      if (userId) {
        q = query(this.documentsCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseDocumentRecord[];

      return { data: documents, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get a single document by ID
  async getDocument(id: string): Promise<{ data: FirebaseDocumentRecord | null; error: any }> {
    try {
      const docRef = doc(this.documentsCollection, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { 
          data: { id: docSnap.id, ...docSnap.data() } as FirebaseDocumentRecord, 
          error: null 
        };
      } else {
        return { data: null, error: new Error('Document not found') };
      }
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update document
  async updateDocument(id: string, updates: Partial<FirebaseDocumentRecord>): Promise<{ data: FirebaseDocumentRecord | null; error: any }> {
    try {
      const docRef = doc(this.documentsCollection, id);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);
      
      // Get updated document
      const { data, error } = await this.getDocument(id);
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete a document
  async deleteDocument(id: string): Promise<{ error: any }> {
    try {
      const docRef = doc(this.documentsCollection, id);
      await deleteDoc(docRef);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Upload file to Firebase Storage
  async uploadFile(
    bucket: 'documents-original' | 'documents-processed',
    path: string,
    file: File
  ): Promise<{ data: any; error: any }> {
    try {
      const storageRef = ref(storage, `${bucket}/${path}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return { data: { path: snapshot.ref.fullPath, downloadURL }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get file URL from Firebase Storage
  async getFileUrl(bucket: 'documents-original' | 'documents-processed', path: string): Promise<string | null> {
    try {
      const storageRef = ref(storage, `${bucket}/${path}`);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  // Delete file from Firebase Storage
  async deleteFile(bucket: 'documents-original' | 'documents-processed', path: string): Promise<{ error: any }> {
    try {
      const storageRef = ref(storage, `${bucket}/${path}`);
      await deleteObject(storageRef);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Subscribe to real-time document updates
  subscribeToDocuments(callback: (documents: FirebaseDocumentRecord[]) => void, userId?: string) {
    let q = query(this.documentsCollection, orderBy('createdAt', 'desc'));
    
    if (userId) {
      q = query(this.documentsCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseDocumentRecord[];
      
      callback(documents);
    });
  }
}

export const firebaseDocumentService = new FirebaseDocumentService();