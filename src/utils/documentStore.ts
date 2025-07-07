
import { ProcessedDocument } from './pdfProcessor';

class DocumentStore {
  private documents: Map<string, ProcessedDocument> = new Map();
  private initialized: boolean = false;

  constructor() {
    // Load documents from localStorage on initialization
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (this.initialized) return;
    
    try {
      console.log('DocumentStore - Loading documents from localStorage');
      const keys = Object.keys(localStorage);
      const docKeys = keys.filter(key => key.startsWith('doc_'));
      console.log('DocumentStore - Found document keys:', docKeys);
      
      // Clear existing documents to avoid duplicates
      this.documents.clear();
      
      docKeys.forEach(key => {
        const docData = localStorage.getItem(key);
        if (docData) {
          try {
            const doc = JSON.parse(docData);
            this.documents.set(doc.id, doc);
            console.log('DocumentStore - Loaded document:', doc.id, doc.name);
          } catch (parseError) {
            console.error('DocumentStore - Error parsing document data:', parseError);
          }
        }
      });
      
      this.initialized = true;
      console.log('DocumentStore - Total documents loaded:', this.documents.size);
    } catch (error) {
      console.error('DocumentStore - Error loading documents from storage:', error);
    }
  }

  // Force reload from localStorage
  private forceReload(): void {
    this.initialized = false;
    this.loadFromStorage();
  }

  storeDocument(document: ProcessedDocument): void {
    console.log('DocumentStore - Storing document:', document.id, document.name);
    this.documents.set(document.id, document);
    
    // Store in localStorage for persistence
    try {
      const docToStore = {
        ...document,
        originalBlob: undefined, // Don't store blobs in localStorage
        processedBlob: undefined
      };
      localStorage.setItem(`doc_${document.id}`, JSON.stringify(docToStore));
      console.log('DocumentStore - Document stored in localStorage');
    } catch (error) {
      console.error('DocumentStore - Error storing document in localStorage:', error);
    }
  }

  getDocument(id: string): ProcessedDocument | null {
    console.log('DocumentStore - Getting document:', id);
    
    // Ensure we've loaded from localStorage
    this.loadFromStorage();
    
    let doc = this.documents.get(id);
    
    // If still not found, try direct localStorage access
    if (!doc) {
      console.log('DocumentStore - Document not in memory, trying direct localStorage access');
      try {
        const docData = localStorage.getItem(`doc_${id}`);
        if (docData) {
          doc = JSON.parse(docData);
          if (doc) {
            // Add back to memory for future access
            this.documents.set(id, doc);
            console.log('DocumentStore - Loaded document from localStorage:', doc.id);
          }
        }
      } catch (error) {
        console.error('DocumentStore - Error loading document from localStorage:', error);
      }
    }
    
    console.log('DocumentStore - Found document:', doc ? 'Yes' : 'No');
    return doc || null;
  }

  getAllDocuments(): ProcessedDocument[] {
    // Force a fresh load from localStorage
    this.forceReload();
    const docs = Array.from(this.documents.values());
    console.log('DocumentStore - Getting all documents, count:', docs.length);
    return docs;
  }

  updateDocument(id: string, updates: Partial<ProcessedDocument>): void {
    console.log('DocumentStore - Updating document:', id);
    const doc = this.documents.get(id);
    if (doc) {
      const updatedDoc = { ...doc, ...updates };
      this.documents.set(id, updatedDoc);
      
      // Update localStorage
      try {
        const docToStore = {
          ...updatedDoc,
          originalBlob: undefined,
          processedBlob: undefined
        };
        localStorage.setItem(`doc_${id}`, JSON.stringify(docToStore));
        console.log('DocumentStore - Document updated in localStorage');
      } catch (error) {
        console.error('DocumentStore - Error updating document in localStorage:', error);
      }
    } else {
      console.warn('DocumentStore - Document not found for update:', id);
    }
  }

  // Store blob URLs separately for download functionality
  storeBlobUrl(documentId: string, type: 'original' | 'processed', blob: Blob): string {
    console.log('DocumentStore - Storing blob URL for document:', documentId, type);
    const url = URL.createObjectURL(blob);
    const key = `${documentId}_${type}_url`;
    sessionStorage.setItem(key, url);
    console.log('DocumentStore - Blob URL stored:', url);
    return url;
  }

  getBlobUrl(documentId: string, type: 'original' | 'processed'): string | null {
    const key = `${documentId}_${type}_url`;
    const url = sessionStorage.getItem(key);
    console.log('DocumentStore - Getting blob URL for:', documentId, type, 'Found:', url ? 'Yes' : 'No');
    return url;
  }
}

export const documentStore = new DocumentStore();
