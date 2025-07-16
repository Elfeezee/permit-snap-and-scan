import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata,
  UploadTask
} from 'firebase/storage';
import { storage } from '@/integrations/firebase/config';

export interface FirebaseStorageFile {
  name: string;
  fullPath: string;
  downloadURL: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
}

export class FirebaseStorageService {
  // Upload file with progress tracking
  uploadFileWithProgress(
    path: string,
    file: File,
    onProgress?: (progress: number) => void
  ): { task: UploadTask; promise: Promise<{ downloadURL: string; path: string }> } {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    const promise = new Promise<{ downloadURL: string; path: string }>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          // Error handling
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ downloadURL, path: uploadTask.snapshot.ref.fullPath });
          } catch (error) {
            reject(error);
          }
        }
      );
    });

    return { task: uploadTask, promise };
  }

  // Simple file upload
  async uploadFile(path: string, file: File): Promise<{ downloadURL: string; path: string; error?: any }> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return { downloadURL, path: snapshot.ref.fullPath };
    } catch (error) {
      return { downloadURL: '', path: '', error };
    }
  }

  // Get download URL for a file
  async getDownloadURL(path: string): Promise<string | null> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  }

  // Delete a file
  async deleteFile(path: string): Promise<{ success: boolean; error?: any }> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // List all files in a directory
  async listFiles(path: string): Promise<{ files: FirebaseStorageFile[]; error?: any }> {
    try {
      const storageRef = ref(storage, path);
      const result = await listAll(storageRef);
      
      const files: FirebaseStorageFile[] = await Promise.all(
        result.items.map(async (itemRef) => {
          const [downloadURL, metadata] = await Promise.all([
            getDownloadURL(itemRef),
            getMetadata(itemRef)
          ]);
          
          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            downloadURL,
            size: metadata.size,
            contentType: metadata.contentType || '',
            timeCreated: metadata.timeCreated,
            updated: metadata.updated
          };
        })
      );

      return { files };
    } catch (error) {
      return { files: [], error };
    }
  }

  // Get file metadata
  async getFileMetadata(path: string): Promise<{ metadata: any; error?: any }> {
    try {
      const storageRef = ref(storage, path);
      const metadata = await getMetadata(storageRef);
      return { metadata };
    } catch (error) {
      return { metadata: null, error };
    }
  }

  // Create storage path for user documents
  createDocumentPath(userId: string, bucket: 'original' | 'processed', filename: string): string {
    return `documents-${bucket}/${userId}/${Date.now()}-${filename}`;
  }

  // Create storage path for user avatars
  createAvatarPath(userId: string, filename: string): string {
    return `avatars/${userId}/${filename}`;
  }
}

export const firebaseStorageService = new FirebaseStorageService();