
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, AlertCircle, ExternalLink, QrCode, RefreshCw } from 'lucide-react';
import { documentStore } from '@/utils/documentStore';
import { ProcessedDocument } from '@/utils/pdfProcessor';

const DocumentViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ProcessedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const loadDocument = async (documentId: string) => {
    console.log('DocumentViewer - Loading document with ID:', documentId);
    
    try {
      const foundDoc = await documentStore.getDocument(documentId);
      
      if (foundDoc) {
        console.log('DocumentViewer - Successfully loaded document:', foundDoc.name);
        setDoc(foundDoc);
        setError(null);
        
        // Create blob URL for PDF viewing if processed blob exists
        if (foundDoc.processedBlob) {
          const url = URL.createObjectURL(foundDoc.processedBlob);
          setPdfUrl(url);
          console.log('DocumentViewer - Created PDF URL for viewing');
        }
      } else {
        console.log('DocumentViewer - Document not found');
        setError('Document not found. The QR code may be invalid or the document may have been processed on a different device.');
      }
    } catch (err) {
      console.error('DocumentViewer - Error retrieving document:', err);
      setError('Error retrieving document.');
    }
  };

  useEffect(() => {
    if (id) {
      loadDocument(id).finally(() => setLoading(false));
    } else {
      setError('No document ID provided.');
      setLoading(false);
    }

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [id]);

  const handleDownload = () => {
    if (!doc || !doc.processedBlob) return;
    
    console.log('Downloading document:', doc.id);
    const url = URL.createObjectURL(doc.processedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `processed_${doc.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const goToMainPage = () => {
    window.location.href = '/';
  };

  const refreshDocument = () => {
    if (id) {
      setLoading(true);
      setError(null);
      setPdfUrl(null);
      loadDocument(id).finally(() => setLoading(false));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error || 'The requested document could not be found.'}
            </p>
            <div className="space-y-2">
              <Button onClick={refreshDocument} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={goToMainPage} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Main Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <span>Document: {doc.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Upload Date:</span>
                  <span className="ml-2 text-gray-600">{doc.uploadDate}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">File Size:</span>
                  <span className="ml-2 text-gray-600">{doc.size}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 text-green-600 font-medium">
                    {doc.status === 'processed' ? 'Processed' : doc.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Document ID:</span>
                  <span className="ml-2 text-gray-600 font-mono text-xs">{doc.id}</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button onClick={handleDownload} size="lg" disabled={!doc.processedBlob}>
                  <Download className="h-5 w-5 mr-2" />
                  Download Processed PDF
                </Button>
                <Button onClick={goToMainPage} variant="outline" size="lg">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Return to Main Page
                </Button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                  <QrCode className="h-5 w-5 mr-2" />
                  About This Document
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    This PDF has been processed with a QR code embedded at the top-right corner for easy sharing and access.
                  </p>
                  <p className="mt-2 font-medium">
                    The QR code links directly to this page for instant access!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {pdfUrl ? (
                <div className="w-full h-96 border rounded-lg overflow-hidden">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <div className="w-full h-96 border rounded-lg flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>PDF preview not available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
