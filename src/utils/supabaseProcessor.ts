import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { documentService, DocumentRecord } from '@/services/documentService';

export interface ProcessedDocument {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'processed';
  shareableUrl?: string;
  dbRecord?: DocumentRecord;
}

export const generateUniqueId = async (): Promise<string> => {
  // This function is now replaced by the database function
  // We'll call the database function through documentService
  const { data, error } = await documentService.generateKasupdaPermitId();
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
    
    // Get the first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    // Embed the QR code image at the top-right corner
    const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
    const qrSize = 82.5;
    
    // Position QR code at top-right corner with better visibility
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
  return `https://snggsgvnbapmihpjoeay.lovableproject.com/document/${documentId}`;
};

export const processDocumentWithSupabase = async (
  file: File,
  userId?: string,
  onProgress?: (progress: number) => void
): Promise<ProcessedDocument> => {
  try {
    onProgress?.(10);

    // Create document record in database (ID is generated automatically)
    const { data: dbRecord, error: dbError } = await documentService.createDocument({
      name: file.name,
      size_mb: Number((file.size / 1024 / 1024).toFixed(2)),
      user_id: userId
    });

    if (dbError || !dbRecord) {
      throw new Error('Failed to create document record');
    }

    onProgress?.(20);

    // Upload original file to storage
    const userFolder = userId || 'anonymous';
    const originalPath = `${userFolder}/${dbRecord.id}_original_${file.name}`;
    
    const { error: uploadError } = await documentService.uploadFile(
      'documents-original',
      originalPath,
      file
    );

    if (uploadError) {
      throw new Error('Failed to upload original file');
    }

    onProgress?.(40);

    // Update document with file path
    await documentService.updateDocument(dbRecord.id, {
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
    const processedPath = `${userFolder}/${dbRecord.id}_processed_${file.name}`;
    
    const processedFile = new File([processedBlob], `processed_${file.name}`, {
      type: 'application/pdf'
    });

    const { error: processedUploadError } = await documentService.uploadFile(
      'documents-processed',
      processedPath,
      processedFile
    );

    if (processedUploadError) {
      throw new Error('Failed to upload processed file');
    }

    onProgress?.(90);

    // Update document as processed
    const { data: finalRecord, error: updateError } = await documentService.updateDocument(dbRecord.id, {
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

export const getProcessedDocumentUrl = (documentRecord: DocumentRecord): string | null => {
  if (!documentRecord.processed_file_path) {
    return null;
  }
  
  return documentService.getFileUrl('documents-processed', documentRecord.processed_file_path);
};

export const downloadProcessedDocument = async (documentRecord: DocumentRecord): Promise<Blob | null> => {
  if (!documentRecord.processed_file_path) {
    return null;
  }

  const { data, error } = await documentService.downloadFile(
    'documents-processed', 
    documentRecord.processed_file_path
  );

  if (error) {
    console.error('Error downloading document:', error);
    return null;
  }

  return data;
};