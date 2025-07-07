
import { ProcessedDocument } from './pdfProcessor';

class DocumentStore {
  private documents: Map<string, ProcessedDocument> = new Map();

  storeDocument(document: ProcessedDocument): void {
    console.log('DocumentStore - Storing document:', document.id, document.name);
    this.documents.set(document.id, document);
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem(`doc_${document.id}`, JSON.stringify(document));
      console.log('DocumentStore - Document stored in localStorage');
    } catch (error) {
      console.error('DocumentStore - Error storing document in localStorage:', error);
    }
  }

  getDocument(id: string): ProcessedDocument | null {
    console.log('DocumentStore - Getting document:', id);
    let doc = this.documents.get(id);
    
    // If not in memory, try localStorage
    if (!doc) {
      try {
        const docData = localStorage.getItem(`doc_${id}`);
        if (docData) {
          doc = JSON.parse(docData);
          if (doc) {
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
    console.log('DocumentStore - Getting all documents');
    
    // Load from localStorage
    try {
      const keys = Object.keys(localStorage);
      const docKeys = keys.filter(key => key.startsWith('doc_'));
      
      docKeys.forEach(key => {
        const docData = localStorage.getItem(key);
        if (docData) {
          try {
            const doc = JSON.parse(docData);
            this.documents.set(doc.id, doc);
          } catch (parseError) {
            console.error('DocumentStore - Error parsing document data:', parseError);
          }
        }
      });
    } catch (error) {
      console.error('DocumentStore - Error loading documents from storage:', error);
    }
    
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
      
      // Update localStorage
      try {
        localStorage.setItem(`doc_${id}`, JSON.stringify(updatedDoc));
        console.log('DocumentStore - Document updated in localStorage');
      } catch (error) {
        console.error('DocumentStore - Error updating document in localStorage:', error);
      }
    } else {
      console.warn('DocumentStore - Document not found for update:', id);
    }
  }
}

export const documentStore = new DocumentStore();
