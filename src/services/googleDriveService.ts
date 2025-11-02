import { supabase } from '@/integrations/supabase/client';

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  size?: number;
  createdTime?: string;
}

// Hardcoded folder IDs
const GOOGLE_DRIVE_FOLDERS = {
  ORIGINAL: '10Aw4FOJce-nKZJghzQZDnhC2LtN5mNdm',
  PROCESSED: '10ktGk354bXnhGAAOmTj7A0uxnhXbeBqY'
};

class GoogleDriveService {
  private async callEdgeFunction(functionName: string, body: any): Promise<any> {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    
    return data;
  }

  async uploadFile(
    folderType: 'original' | 'processed',
    file: File,
    fileName: string
  ): Promise<{ data: GoogleDriveFile | null; error: any }> {
    try {
      const folderId = GOOGLE_DRIVE_FOLDERS[folderType.toUpperCase() as 'ORIGINAL' | 'PROCESSED'];
      
      // Convert File to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const result = await this.callEdgeFunction('google-drive-upload', {
        folderId,
        fileName,
        fileData: base64Data,
        mimeType: file.type,
        makePublic: folderType === 'processed'
      });

      return { 
        data: result.data as GoogleDriveFile, 
        error: null 
      };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      return { data: null, error };
    }
  }

  async makeFilePublic(fileId: string): Promise<{ error: any }> {
    // This is now handled in the upload function
    return { error: null };
  }

  async getFileUrl(fileId: string): Promise<string | null> {
    try {
      const result = await this.callEdgeFunction('google-drive-get-url', {
        fileId
      });

      return result.url || null;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  async downloadFile(fileId: string): Promise<Blob | null> {
    try {
      const result = await this.callEdgeFunction('google-drive-download', {
        fileId
      });

      // Convert base64 back to Blob
      const binaryString = atob(result.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Blob([bytes]);
    } catch (error) {
      console.error('Error downloading file from Google Drive:', error);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<{ error: any }> {
    // Not implemented yet - can add edge function if needed
    return { error: new Error('Delete not implemented') };
  }

  async getFileMetadata(fileId: string): Promise<{
    data: { name: string; size: number; createdTime: string } | null;
    error: any;
  }> {
    // Not implemented yet - can add edge function if needed
    return { data: null, error: new Error('Get metadata not implemented') };
  }

  async listFilesInFolder(folderId: string): Promise<{
    data: Array<{ id: string; name: string; size: number }> | null;
    error: any;
  }> {
    // Not implemented yet - can add edge function if needed
    return { data: null, error: new Error('List files not implemented') };
  }
}

// Helper functions
export function isGoogleDriveFile(path: string | null | undefined): boolean {
  return path?.startsWith('gdrive://') ?? false;
}

export function extractGoogleDriveFileId(path: string): string {
  return path.replace('gdrive://', '');
}

export function createGoogleDrivePath(fileId: string): string {
  return `gdrive://${fileId}`;
}

export const googleDriveService = new GoogleDriveService();
