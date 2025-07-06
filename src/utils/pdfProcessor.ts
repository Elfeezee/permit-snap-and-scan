
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { uploadDocumentToFirebase, createFirebaseShareableUrl, FirebaseDocumentMetadata } from './firebaseStorage';

export interface ProcessedDocument {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'processed';
  originalBlob?: Blob;
  processedBlob?: Blob;
  shareableUrl?: string;
  firebaseUrl?: string;
}

export const generateUniqueId = (): string => {
  return `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const generateQRCode = async (url: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 80,
      margin: 1,
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
    const qrSize = 60;
    
    // Position QR code at top-right corner
    firstPage.drawImage(qrImage, {
      x: width - qrSize - 20,
      y: height - qrSize - 20,
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
  return createFirebaseShareableUrl(documentId);
};

export const processAndUploadDocument = async (
  doc: ProcessedDocument,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProcessedDocument> => {
  try {
    console.log('Starting Firebase-integrated processing for document:', doc.id);
    
    onProgress?.(10);
    
    // Create shareable URL
    const shareableUrl = createShareableUrl(doc.id);
    console.log('Created shareable URL:', shareableUrl);
    onProgress?.(25);

    // Generate QR code for shareable link
    const qrCodeDataUrl = await generateQRCode(shareableUrl);
    onProgress?.(50);

    // Embed QR code in PDF
    const processedBlob = await embedQRCodeInPDF(file, qrCodeDataUrl);
    onProgress?.(75);

    // Upload to Firebase
    const firebaseMetadata: FirebaseDocumentMetadata = {
      id: doc.id,
      name: doc.name,
      size: doc.size,
      uploadDate: doc.uploadDate,
      originalName: doc.name
    };
    
    const firebaseUrl = await uploadDocumentToFirebase(doc.id, processedBlob, firebaseMetadata);
    onProgress?.(100);

    // Return updated document
    const updatedDoc: ProcessedDocument = {
      ...doc,
      status: 'processed',
      shareableUrl,
      processedBlob,
      firebaseUrl
    };

    console.log('Document processed and uploaded to Firebase successfully:', updatedDoc);
    return updatedDoc;
  } catch (error) {
    console.error('Error processing and uploading document:', error);
    throw error;
  }
};
