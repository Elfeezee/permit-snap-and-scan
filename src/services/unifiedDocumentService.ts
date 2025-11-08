import { documentService, DocumentRecord } from './documentService';
import { firebaseDocumentService, FirebaseDocumentService } from './firebaseDocumentService';
import { useCurrentSystem, isUsingFirebase } from '@/utils/systemSelector';
import { FirebaseDocumentRecord } from '@/integrations/firebase/types';
import { Timestamp } from 'firebase/firestore';

// Unified interface that works with both systems
export interface UnifiedDocumentRecord {
  id: string;
  name: string;
  size_mb: number;
  status: string;
  kasupda_permit_id?: string;
  processed_date?: string;
  user_id?: string;
  original_file_path?: string;
  processed_file_path?: string;
  shareable_url?: string;
  created_at: string;
  updated_at: string;
  google_maps_link?: string;
}

// Convert Firebase document to unified format
function firebaseToUnified(doc: FirebaseDocumentRecord): UnifiedDocumentRecord {
  return {
    id: doc.id,
    name: doc.name,
    size_mb: doc.sizeMb,
    status: doc.status,
    kasupda_permit_id: undefined,
    processed_date: doc.processedDate instanceof Timestamp ? doc.processedDate.toDate().toISOString() : doc.processedDate,
    user_id: doc.userId,
    original_file_path: doc.originalFilePath,
    processed_file_path: doc.processedFilePath,
    shareable_url: doc.shareableUrl,
    created_at: doc.createdAt instanceof Timestamp ? doc.createdAt.toDate().toISOString() : doc.createdAt,
    updated_at: doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate().toISOString() : doc.updatedAt,
  };
}

// Convert Supabase document to unified format
function supabaseToUnified(doc: DocumentRecord): UnifiedDocumentRecord {
  return {
    id: doc.id,
    name: doc.name,
    size_mb: doc.size_mb,
    status: doc.status,
    kasupda_permit_id: doc.kasupda_permit_id,
    processed_date: doc.processed_date,
    user_id: doc.user_id,
    original_file_path: doc.original_file_path,
    processed_file_path: doc.processed_file_path,
    shareable_url: doc.shareable_url,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    google_maps_link: doc.google_maps_link,
  };
}

export class UnifiedDocumentService {
  async generateKasupdaPermitId(): Promise<{ data: string | null; error: any }> {
    if (isUsingFirebase()) {
      return firebaseDocumentService.generateKasupdaPermitId();
    } else {
      return documentService.generateKasupdaPermitId();
    }
  }

  async createDocument(data: {
    name: string;
    size_mb: number;
    user_id?: string;
    original_file_path?: string;
    google_maps_link?: string;
  }): Promise<{ data: UnifiedDocumentRecord | null; error: any }> {
    if (isUsingFirebase()) {
      const firebaseData = {
        name: data.name,
        sizeMb: data.size_mb,
        userId: data.user_id,
        originalFilePath: data.original_file_path,
        googleMapsLink: data.google_maps_link,
      };
      const result = await firebaseDocumentService.createDocument(firebaseData);
      return {
        data: result.data ? firebaseToUnified(result.data) : null,
        error: result.error
      };
    } else {
      const result = await documentService.createDocument(data);
      return {
        data: result.data ? supabaseToUnified(result.data) : null,
        error: result.error,
      };
    }
  }

  async getDocuments(userId?: string): Promise<{ data: UnifiedDocumentRecord[] | null; error: any }> {
    if (isUsingFirebase()) {
      const result = await firebaseDocumentService.getDocuments(userId);
      return {
        data: result.data ? result.data.map(firebaseToUnified) : null,
        error: result.error
      };
    } else {
      const result = await documentService.getDocuments(userId);
      return {
        data: result.data ? result.data.map(supabaseToUnified) : null,
        error: result.error
      };
    }
  }

  async getDocument(id: string): Promise<{ data: UnifiedDocumentRecord | null; error: any }> {
    if (isUsingFirebase()) {
      const result = await firebaseDocumentService.getDocument(id);
      return {
        data: result.data ? firebaseToUnified(result.data) : null,
        error: result.error
      };
    } else {
      const result = await documentService.getDocument(id);
      return {
        data: result.data ? supabaseToUnified(result.data) : null,
        error: result.error
      };
    }
  }

  async updateDocument(id: string, updates: Partial<UnifiedDocumentRecord>): Promise<{ data: UnifiedDocumentRecord | null; error: any }> {
    if (isUsingFirebase()) {
      // Convert unified updates to Firebase format
      const firebaseUpdates: Partial<FirebaseDocumentRecord> = {
        ...(updates.name && { name: updates.name }),
        ...(updates.size_mb && { sizeMb: updates.size_mb }),
        ...(updates.status && { status: updates.status as any }),
        ...(updates.processed_date && { processedDate: Timestamp.fromDate(new Date(updates.processed_date)) }),
        ...(updates.user_id && { userId: updates.user_id }),
        ...(updates.original_file_path && { originalFilePath: updates.original_file_path }),
        ...(updates.processed_file_path && { processedFilePath: updates.processed_file_path }),
        ...(updates.shareable_url && { shareableUrl: updates.shareable_url }),
      };
      
      const result = await firebaseDocumentService.updateDocument(id, firebaseUpdates);
      return {
        data: result.data ? firebaseToUnified(result.data) : null,
        error: result.error
      };
    } else {
      const result = await documentService.updateDocument(id, updates);
      return {
        data: result.data ? supabaseToUnified(result.data) : null,
        error: result.error
      };
    }
  }

  async deleteDocument(id: string): Promise<{ error: any }> {
    if (isUsingFirebase()) {
      return firebaseDocumentService.deleteDocument(id);
    } else {
      return documentService.deleteDocument(id);
    }
  }

  async uploadFile(
    bucket: 'documents-original' | 'documents-processed',
    path: string,
    file: File
  ): Promise<{ data: any; error: any }> {
    if (isUsingFirebase()) {
      return firebaseDocumentService.uploadFile(bucket, path, file);
    } else {
      return documentService.uploadFile(bucket, path, file);
    }
  }

  getFileUrl(bucket: 'documents-original' | 'documents-processed', path: string): string | Promise<string | null> {
    if (isUsingFirebase()) {
      return firebaseDocumentService.getFileUrl(bucket, path);
    } else {
      return documentService.getFileUrl(bucket, path);
    }
  }

  async downloadFile(bucket: 'documents-original' | 'documents-processed', path: string): Promise<{ data: Blob | null; error: any }> {
    if (isUsingFirebase()) {
      // For Firebase, we fetch from download URL
      try {
        const downloadURL = await firebaseDocumentService.getFileUrl(bucket, path);
        if (!downloadURL) {
          return { data: null, error: 'File not found' };
        }
        const response = await fetch(downloadURL);
        const blob = await response.blob();
        return { data: blob, error: null };
      } catch (error) {
        return { data: null, error };
      }
    } else {
      return documentService.downloadFile(bucket, path);
    }
  }

  // Note: Real-time subscriptions would need different handling for each system
  subscribeToDocuments(callback: (documents: UnifiedDocumentRecord[]) => void, userId?: string) {
    if (isUsingFirebase()) {
      return firebaseDocumentService.subscribeToDocuments((docs) => {
        callback(docs.map(firebaseToUnified));
      }, userId);
    } else {
      return documentService.subscribeToDocuments((payload) => {
        // Handle Supabase real-time format
        this.getDocuments(userId).then(({ data }) => {
          if (data) callback(data);
        });
      }, userId);
    }
  }
}

export const unifiedDocumentService = new UnifiedDocumentService();