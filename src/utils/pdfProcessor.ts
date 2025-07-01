
import { PDFDocument, rgb } from 'pdf-lib';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface ProcessedDocument {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'processed';
  barcodeValue?: string;
  originalBlob?: Blob;
  processedBlob?: Blob;
  shareableUrl?: string;
}

export const generateUniqueId = (): string => {
  return `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const generateBarcode = (value: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 10,
      margin: 5
    });
    resolve(canvas.toDataURL());
  });
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

export const embedBarcodeInPDF = async (
  pdfFile: File, 
  barcodeDataUrl: string, 
  qrCodeDataUrl: string
): Promise<Blob> => {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Get the first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    // Embed the barcode image - place it at the bottom center of the document
    const barcodeImage = await pdfDoc.embedPng(barcodeDataUrl);
    const barcodeScale = 0.7;
    const barcodeWidth = barcodeImage.width * barcodeScale;
    const barcodeHeight = barcodeImage.height * barcodeScale;
    
    // Position barcode at bottom center
    firstPage.drawImage(barcodeImage, {
      x: (width - barcodeWidth) / 2,
      y: 30,
      width: barcodeWidth,
      height: barcodeHeight,
    });
    
    // Embed the QR code image at bottom-right corner
    const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
    const qrSize = 60;
    
    // Position QR code at bottom-right corner
    firstPage.drawImage(qrImage, {
      x: width - qrSize - 20,
      y: 20,
      width: qrSize,
      height: qrSize,
    });
    
    // Add text label for QR code
    firstPage.drawText('Scan for link', {
      x: width - qrSize - 20,
      y: 85,
      size: 7,
      color: rgb(0, 0, 0),
    });
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error embedding barcode in PDF:', error);
    throw error;
  }
};

export const createShareableUrl = (documentId: string): string => {
  return `${window.location.origin}/document/${documentId}`;
};
