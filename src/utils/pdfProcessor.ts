
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export interface ProcessedDocument {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'processed';
  originalBlob?: Blob;
  processedBlob?: Blob;
  shareableUrl?: string;
  barcodeData?: string;
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

export const generateBarcode = async (data: string): Promise<string> => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, data, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0
    });
    return canvas.toDataURL();
  } catch (error) {
    console.error('Error generating barcode:', error);
    throw error;
  }
};

export const embedCodesInPDF = async (
  pdfFile: File, 
  qrCodeDataUrl: string,
  barcodeDataUrl: string
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
    
    // Add text label for QR code
    firstPage.drawText('Scan for link', {
      x: width - qrSize - 20,
      y: height - 15,
      size: 7,
      color: rgb(0, 0, 0),
    });

    // Embed the barcode at the bottom center
    const barcodeImage = await pdfDoc.embedPng(barcodeDataUrl);
    const barcodeWidth = 120;
    const barcodeHeight = 40;
    
    // Position barcode at bottom center
    firstPage.drawImage(barcodeImage, {
      x: (width - barcodeWidth) / 2,
      y: 30,
      width: barcodeWidth,
      height: barcodeHeight,
    });
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error embedding codes in PDF:', error);
    throw error;
  }
};

export const createShareableUrl = (documentId: string): string => {
  return `${window.location.origin}/document/${documentId}`;
};
