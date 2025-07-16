import { documentService } from './documentService';
import { firebaseDocumentService } from './firebaseDocumentService';
import { useAuth } from '@/hooks/useAuth';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { isUsingFirebase } from '@/utils/systemSelector';

// Data migration utilities
export class DataMigrationService {
  // Migrate all documents from Supabase to Firebase
  async migrateDocumentsToFirebase(userId?: string): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[] 
  }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // Get all documents from Supabase
      const { data: supabaseDocuments, error } = await documentService.getDocuments(userId);
      
      if (error || !supabaseDocuments) {
        results.errors.push(`Failed to fetch Supabase documents: ${error}`);
        return results;
      }

      // Migrate each document
      for (const doc of supabaseDocuments) {
        try {
          // Convert Supabase document to Firebase format
          const firebaseDoc = {
            name: doc.name,
            sizeMb: doc.size_mb,
            userId: doc.user_id,
            originalFilePath: doc.original_file_path,
            processedFilePath: doc.processed_file_path,
            shareableUrl: doc.shareable_url,
            status: doc.status,
          };

          // Create in Firebase with the same custom ID
          const { error: createError } = await firebaseDocumentService.createDocument(firebaseDoc);
          
          if (createError) {
            results.failed++;
            results.errors.push(`Failed to migrate document ${doc.id}: ${createError}`);
          } else {
            results.success++;
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`Error migrating document ${doc.id}: ${err}`);
        }
      }

      return results;
    } catch (err) {
      results.errors.push(`Migration failed: ${err}`);
      return results;
    }
  }

  // Migrate user data from Supabase to Firebase
  async migrateUserToFirebase(supabaseUserId: string, firebaseUserId: string): Promise<{ 
    success: boolean; 
    error?: string 
  }> {
    try {
      // This would migrate user profile data if you have a profiles table in Supabase
      // For now, we'll just migrate documents
      const migrationResult = await this.migrateDocumentsToFirebase(supabaseUserId);
      
      if (migrationResult.failed > 0) {
        return { 
          success: false, 
          error: `Migration completed with ${migrationResult.failed} failures: ${migrationResult.errors.join(', ')}` 
        };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: `Migration failed: ${err}` };
    }
  }

  // Sync data between both systems (for running in parallel)
  async syncDocumentToOtherSystem(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (isUsingFirebase()) {
        // Currently using Firebase, sync to Supabase
        const { data: firebaseDoc, error } = await firebaseDocumentService.getDocument(documentId);
        if (error || !firebaseDoc) {
          return { success: false, error: `Failed to get Firebase document: ${error}` };
        }

        const supabaseDoc = {
          name: firebaseDoc.name,
          size_mb: firebaseDoc.sizeMb,
          user_id: firebaseDoc.userId,
          original_file_path: firebaseDoc.originalFilePath,
          processed_file_path: firebaseDoc.processedFilePath,
          shareable_url: firebaseDoc.shareableUrl,
          status: firebaseDoc.status,
        };

        const { error: createError } = await documentService.createDocument(supabaseDoc);
        return { success: !createError, error: createError };
      } else {
        // Currently using Supabase, sync to Firebase
        const { data: supabaseDoc, error } = await documentService.getDocument(documentId);
        if (error || !supabaseDoc) {
          return { success: false, error: `Failed to get Supabase document: ${error}` };
        }

        const firebaseDoc = {
          name: supabaseDoc.name,
          sizeMb: supabaseDoc.size_mb,
          userId: supabaseDoc.user_id,
          originalFilePath: supabaseDoc.original_file_path,
          processedFilePath: supabaseDoc.processed_file_path,
          shareableUrl: supabaseDoc.shareable_url,
          status: supabaseDoc.status,
        };

        const { error: createError } = await firebaseDocumentService.createDocument(firebaseDoc);
        return { success: !createError, error: createError };
      }
    } catch (err) {
      return { success: false, error: `Sync failed: ${err}` };
    }
  }

  // Compare data between both systems
  async compareDocuments(userId?: string): Promise<{
    supabaseOnly: string[];
    firebaseOnly: string[];
    common: string[];
    conflicts: Array<{ id: string; differences: string[] }>;
  }> {
    const result = {
      supabaseOnly: [] as string[],
      firebaseOnly: [] as string[],
      common: [] as string[],
      conflicts: [] as Array<{ id: string; differences: string[] }>
    };

    try {
      // Get documents from both systems
      const [supabaseResult, firebaseResult] = await Promise.all([
        documentService.getDocuments(userId),
        firebaseDocumentService.getDocuments(userId)
      ]);

      const supabaseIds = new Set(supabaseResult.data?.map(doc => doc.id) || []);
      const firebaseIds = new Set(firebaseResult.data?.map(doc => doc.id) || []);

      // Find documents only in Supabase
      supabaseIds.forEach(id => {
        if (!firebaseIds.has(id)) {
          result.supabaseOnly.push(id);
        }
      });

      // Find documents only in Firebase
      firebaseIds.forEach(id => {
        if (!supabaseIds.has(id)) {
          result.firebaseOnly.push(id);
        }
      });

      // Find common documents and check for conflicts
      supabaseIds.forEach(id => {
        if (firebaseIds.has(id)) {
          result.common.push(id);
          
          // Compare document details for conflicts
          const supabaseDoc = supabaseResult.data?.find(doc => doc.id === id);
          const firebaseDoc = firebaseResult.data?.find(doc => doc.id === id);
          
          if (supabaseDoc && firebaseDoc) {
            const differences: string[] = [];
            
            if (supabaseDoc.name !== firebaseDoc.name) {
              differences.push(`name: Supabase="${supabaseDoc.name}" Firebase="${firebaseDoc.name}"`);
            }
            if (supabaseDoc.status !== firebaseDoc.status) {
              differences.push(`status: Supabase="${supabaseDoc.status}" Firebase="${firebaseDoc.status}"`);
            }
            
            if (differences.length > 0) {
              result.conflicts.push({ id, differences });
            }
          }
        }
      });

      return result;
    } catch (err) {
      console.error('Data comparison failed:', err);
      return result;
    }
  }
}

export const dataMigrationService = new DataMigrationService();