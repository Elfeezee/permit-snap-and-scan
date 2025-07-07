
import { ProcessedDocument } from './pdfProcessor';

class DocumentStore {
  private documents: Map<string, ProcessedDocument> = new Map();
  private blobUrls: Map<string, string> = new Map();

  storeDocument(document: ProcessedDocument): void {
    console.log('DocumentStore - Storing document:', document.id, document.name);
    this.documents.set(document.id, document);
  }

  storeBlobUrl(documentId: string, type: 'original' | 'processed', blob: Blob): void {
    const blobUrl = URL.createObjectURL(blob);
    const key = `${documentId}_${type}`;
    this.blobUrls.set(key, blobUrl);
    console.log('DocumentStore - Stored blob URL for:', documentId, type);
  }

  getBlobUrl(documentId: string, type: 'original' | 'processed'): string | null {
    const key = `${documentId}_${type}`;
    const url = this.blobUrls.get(key);
    console.log('DocumentStore - Getting blob URL for:', documentId, type, url ? 'Found' : 'Not found');
    return url || null;
  }

  getDocument(id: string): ProcessedDocument | null {
    console.log('DocumentStore - Getting document:', id);
    const doc = this.documents.get(id);
    console.log('DocumentStore - Found document:', doc ? 'Yes' : 'No');
    return doc || null;
  }

  getAllDocuments(): ProcessedDocument[] {
    console.log('DocumentStore - Getting all documents');
    const docs = Array.from(this.documents.values());
    console.log('DocumentStore - Total documents:', docs.length);
    return docs;
  }

  updateDocument(id: string, updates: Partial<ProcessedDocument>): void {
    console.log('DocumentStore - Updating document:', id);
    const doc = this.documents.get(id);
    if (doc) {
      const updatedDoc = { ...doc, ...updates };
      this.documents.set(id, updatedDoc);
    } else {
      console.warn('DocumentStore - Document not found for update:', id);
    }
  }
}

export const documentStore = new DocumentStore();
