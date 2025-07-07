
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export interface ProcessedDocument {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'processed';
  originalBlob?: Blob;
  processedBlob?: Blob;
  shareableUrl?: string;
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
    
    // Position QR code at top-right corner (removed the text label)
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
  return `${window.location.origin}/document/${documentId}`;
};
