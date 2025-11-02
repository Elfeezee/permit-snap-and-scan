import { google } from 'googleapis';

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  size?: number;
  createdTime?: string;
}

class GoogleDriveService {
  private credentials: any = null;
  private drive: any = null;

  private initializeClient() {
    if (this.drive) return this.drive;

    try {
      // Get service account from environment
      const serviceAccountJson = import.meta.env.VITE_GOOGLE_DRIVE_SERVICE_ACCOUNT;
      
      if (!serviceAccountJson) {
        throw new Error('Google Drive service account credentials not found');
      }

      this.credentials = JSON.parse(serviceAccountJson);

      const auth = new google.auth.JWT({
        email: this.credentials.client_email,
        key: this.credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      return this.drive;
    } catch (error) {
      console.error('Failed to initialize Google Drive client:', error);
      throw error;
    }
  }

  async uploadFile(
    folderId: string,
    file: File,
    fileName: string
  ): Promise<{ data: GoogleDriveFile | null; error: any }> {
    try {
      const drive = this.initializeClient();

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: file.type,
        body: buffer,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, size, createdTime',
      });

      return { 
        data: response.data as GoogleDriveFile, 
        error: null 
      };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      return { data: null, error };
    }
  }

  async makeFilePublic(fileId: string): Promise<{ error: any }> {
    try {
      const drive = this.initializeClient();

      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return { error: null };
    } catch (error) {
      console.error('Error making file public:', error);
      return { error };
    }
  }

  async getFileUrl(fileId: string): Promise<string | null> {
    try {
      const drive = this.initializeClient();

      const response = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink, webContentLink',
      });

      // Return direct download link if available, otherwise view link
      return response.data.webContentLink || response.data.webViewLink || null;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  async downloadFile(fileId: string): Promise<Blob | null> {
    try {
      const drive = this.initializeClient();

      const response = await drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        {
          responseType: 'arraybuffer',
        }
      );

      return new Blob([response.data]);
    } catch (error) {
      console.error('Error downloading file from Google Drive:', error);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<{ error: any }> {
    try {
      const drive = this.initializeClient();

      await drive.files.delete({
        fileId: fileId,
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      return { error };
    }
  }

  async getFileMetadata(fileId: string): Promise<{
    data: { name: string; size: number; createdTime: string } | null;
    error: any;
  }> {
    try {
      const drive = this.initializeClient();

      const response = await drive.files.get({
        fileId: fileId,
        fields: 'name, size, createdTime',
      });

      return { 
        data: response.data, 
        error: null 
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return { data: null, error };
    }
  }

  async listFilesInFolder(folderId: string): Promise<{
    data: Array<{ id: string; name: string; size: number }> | null;
    error: any;
  }> {
    try {
      const drive = this.initializeClient();

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, size)',
        pageSize: 1000,
      });

      return { 
        data: response.data.files || [], 
        error: null 
      };
    } catch (error) {
      console.error('Error listing files in folder:', error);
      return { data: null, error };
    }
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
