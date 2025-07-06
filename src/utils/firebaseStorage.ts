
import { ref, uploadBytes, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from './firebase';
import { ProcessedDocument } from './pdfProcessor';

export interface FirebaseDocumentMetadata {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  originalName: string;
}

export const uploadDocumentToFirebase = async (
  documentId: string,
  processedBlob: Blob,
  metadata: FirebaseDocumentMetadata
): Promise<string> => {
  try {
    console.log('Uploading document to Firebase:', documentId);
    
    // Create a reference to the file in Firebase Storage
    const storageRef = ref(storage, `documents/${documentId}.pdf`);
    
    // Upload the file with metadata
    const uploadResult = await uploadBytes(storageRef, processedBlob, {
      customMetadata: {
        documentId: metadata.id,
        originalName: metadata.name,
        size: metadata.size,
        uploadDate: metadata.uploadDate
      }
    });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log('Document uploaded successfully:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading document to Firebase:', error);
    throw error;
  }
};

export const getDocumentFromFirebase = async (documentId: string): Promise<{
  url: string;
  metadata: FirebaseDocumentMetadata;
} | null> => {
  try {
    console.log('Retrieving document from Firebase:', documentId);
    
    const storageRef = ref(storage, `documents/${documentId}.pdf`);
    
    // Get download URL and metadata
    const [downloadURL, metadata] = await Promise.all([
      getDownloadURL(storageRef),
      getMetadata(storageRef)
    ]);
    
    const documentMetadata: FirebaseDocumentMetadata = {
      id: metadata.customMetadata?.documentId || documentId,
      name: metadata.customMetadata?.originalName || 'Unknown Document',
      size: metadata.customMetadata?.size || 'Unknown Size',
      uploadDate: metadata.customMetadata?.uploadDate || 'Unknown Date',
      originalName: metadata.customMetadata?.originalName || 'Unknown Document'
    };
    
    console.log('Document retrieved successfully from Firebase');
    return { url: downloadURL, metadata: documentMetadata };
  } catch (error) {
    console.error('Error retrieving document from Firebase:', error);
    return null;
  }
};

export const createFirebaseShareableUrl = (documentId: string): string => {
  return `${window.location.origin}/document/${documentId}`;
};
