import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { unifiedDocumentService, UnifiedDocumentRecord } from '@/services/unifiedDocumentService';
import { firebaseStorageService } from '@/services/firebaseStorageService';
import { isUsingFirebase } from '@/utils/systemSelector';

export interface ProcessedDocument {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'processed';
  shareableUrl?: string;
  dbRecord?: UnifiedDocumentRecord;
}

export const generateUniqueId = async (): Promise<string> => {
  const { data, error } = await unifiedDocumentService.generateKasupdaPermitId();
  if (error || !data) {
    throw new Error('Failed to generate document ID');
  }
  return data;
};

export const generateQRCode = async (url: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 82.5,
      margin: 4,
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

export const embedQRCodeInPDF = async (
  pdfFile: File, 
  qrCodeDataUrl: string
): Promise<Blob> => {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
    const qrSize = 82.5;
    
    firstPage.drawImage(qrImage, {
      x: width - qrSize - 15,
      y: height - qrSize - 15,
      width: qrSize,
      height: qrSize,
    });
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error embedding QR code in PDF:', error);
    throw error;
  }
};

export const createShareableUrl = (documentId: string): string => {
  return `https://permitqrcode.lovable.app/document/${documentId}`;
};

// Updated processor that works with both Supabase and Firebase
export const processDocument = async (
  file: File,
  userId?: string,
  googleMapsLink?: string,
  onProgress?: (progress: number) => void
): Promise<ProcessedDocument> => {
 try {
  onProgress?.(10);

    // Create document record in database (works with both systems)
    const { data: dbRecord, error: dbError } = await unifiedDocumentService.createDocument({
      name: file.name,
      size_mb: Number((file.size / 1024 / 1024).toFixed(2)),
      user_id: userId,
      google_maps_link: googleMapsLink
     });

    if (dbError || !dbRecord) {
      throw new Error('Failed to create document record');
    }

    onProgress?.(20);

    // Upload original file to storage
    const userFolder = userId || 'anonymous';
    let originalPath: string;
    let uploadResult: any;

    if (isUsingFirebase()) {
      // Firebase storage path structure
      originalPath = firebaseStorageService.createDocumentPath(userFolder, 'original', file.name);
      uploadResult = await firebaseStorageService.uploadFile(originalPath, file);
      
      if (uploadResult.error) {
        throw new Error('Failed to upload original file to Firebase');
      }
    } else {
      // Supabase storage path structure  
      originalPath = `${userFolder}/${dbRecord.id}_original_${file.name}`;
      uploadResult = await unifiedDocumentService.uploadFile('documents-original', originalPath, file);
      
      if (uploadResult.error) {
        throw new Error('Failed to upload original file to Supabase');
      }
    }

    onProgress?.(40);

    // Update document with file path
    await unifiedDocumentService.updateDocument(dbRecord.id, {
      original_file_path: originalPath,
      status: 'processing'
    });

    onProgress?.(50);

    // Create shareable URL
    const shareableUrl = createShareableUrl(dbRecord.id);

    onProgress?.(60);

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(shareableUrl);

    onProgress?.(70);

    // Process PDF with QR code
    const processedBlob = await embedQRCodeInPDF(file, qrCodeDataUrl);

    onProgress?.(80);

    // Upload processed file
    let processedPath: string;
    let processedUploadResult: any;
    
    const processedFile = new File([processedBlob], `processed_${file.name}`, {
      type: 'application/pdf'
    });

    if (isUsingFirebase()) {
      // Firebase processed documents are public, so different path structure
      processedPath = firebaseStorageService.createDocumentPath(userFolder, 'processed', file.name);
      processedUploadResult = await firebaseStorageService.uploadFile(processedPath, processedFile);
      
      if (processedUploadResult.error) {
        throw new Error('Failed to upload processed file to Firebase');
      }
    } else {
      // Supabase storage path structure
      processedPath = `${userFolder}/${dbRecord.id}_processed_${file.name}`;
      processedUploadResult = await unifiedDocumentService.uploadFile('documents-processed', processedPath, processedFile);
      
      if (processedUploadResult.error) {
        throw new Error('Failed to upload processed file to Supabase');
      }
    }

    onProgress?.(90);

    // Update document as processed
    const { data: finalRecord, error: updateError } = await unifiedDocumentService.updateDocument(dbRecord.id, {
      processed_file_path: processedPath,
      shareable_url: shareableUrl,
      status: 'processed',
      processed_date: new Date().toISOString()
    });

    if (updateError || !finalRecord) {
      throw new Error('Failed to update document record');
    }

    onProgress?.(100);

    // Convert to ProcessedDocument format
    const processedDoc: ProcessedDocument = {
      id: finalRecord.id,
      name: finalRecord.name,
      size: `${finalRecord.size_mb} MB`,
      uploadDate: new Date(finalRecord.upload_date).toLocaleDateString(),
      status: finalRecord.status as any,
      shareableUrl: finalRecord.shareable_url,
      dbRecord: finalRecord
    };

    return processedDoc;

  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
};

export const getProcessedDocumentUrl = async (documentRecord: UnifiedDocumentRecord): Promise<string | null> => {
  if (!documentRecord.processed_file_path) {
    return null;
  }
  
  if (isUsingFirebase()) {
    return await firebaseStorageService.getDownloadURL(documentRecord.processed_file_path);
  } else {
    const url = unifiedDocumentService.getFileUrl('documents-processed', documentRecord.processed_file_path);
    return typeof url === 'string' ? url : await url;
  }
};

export const downloadProcessedDocument = async (documentRecord: UnifiedDocumentRecord): Promise<Blob | null> => {
  if (!documentRecord.processed_file_path) {
    return null;
  }

  try {
    if (isUsingFirebase()) {
      // For Firebase, we need to fetch the file from the download URL
      const downloadURL = await firebaseStorageService.getDownloadURL(documentRecord.processed_file_path);
      if (!downloadURL) return null;
      
      const response = await fetch(downloadURL);
      return await response.blob();
    } else {
      // Supabase download
      const result = await unifiedDocumentService.downloadFile('documents-processed', documentRecord.processed_file_path);
      return result.data || null;
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    return null;
  }
};

// Legacy function for backward compatibility
export const processDocumentWithSupabase = processDocument;