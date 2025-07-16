import { Timestamp } from 'firebase/firestore';

export interface FirebaseDocumentRecord {
  id: string;
  name: string;
  sizeMb: number;
  status: 'uploaded' | 'processing' | 'processed';
  uploadDate: Timestamp;
  processedDate?: Timestamp;
  userId?: string;
  originalFilePath?: string;
  processedFilePath?: string;
  shareableUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}