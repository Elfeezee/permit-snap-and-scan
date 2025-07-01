
import { ProcessedDocument } from './pdfProcessor';

class DocumentStore {
  private documents: Map<string, ProcessedDocument> = new Map();

  constructor() {
    // Load documents from localStorage on initialization
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('doc_')) {
          const docData = localStorage.getItem(key);
          if (docData) {
            const doc = JSON.parse(docData);
            this.documents.set(doc.id, doc);
          }
        }
      });
    } catch (error) {
      console.error('Error loading documents from storage:', error);
    }
  }

  storeDocument(document: ProcessedDocument): void {
    this.documents.set(document.id, document);
    // Store in localStorage for persistence
    localStorage.setItem(`doc_${document.id}`, JSON.stringify({
      ...document,
      originalBlob: undefined, // Don't store blobs in localStorage
      processedBlob: undefined
    }));
  }

  getDocument(id: string): ProcessedDocument | null {
    return this.documents.get(id) || null;
  }

  getAllDocuments(): ProcessedDocument[] {
    return Array.from(this.documents.values());
  }

  updateDocument(id: string, updates: Partial<ProcessedDocument>): void {
    const doc = this.documents.get(id);
    if (doc) {
      const updatedDoc = { ...doc, ...updates };
      this.documents.set(id, updatedDoc);
      localStorage.setItem(`doc_${id}`, JSON.stringify({
        ...updatedDoc,
        originalBlob: undefined,
        processedBlob: undefined
      }));
    }
  }

  // Store blob URLs separately for download functionality
  storeBlobUrl(documentId: string, type: 'original' | 'processed', blob: Blob): string {
    const url = URL.createObjectURL(blob);
    const key = `${documentId}_${type}_url`;
    sessionStorage.setItem(key, url);
    return url;
  }

  getBlobUrl(documentId: string, type: 'original' | 'processed'): string | null {
    const key = `${documentId}_${type}_url`;
    return sessionStorage.getItem(key);
  }
}

export const documentStore = new DocumentStore();
