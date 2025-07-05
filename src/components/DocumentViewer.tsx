
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

  useEffect(() => {
    console.log('DocumentViewer - Looking for document with ID:', id);
    if (id) {
      try {
        const foundDoc = documentStore.getDocument(id);
        console.log('DocumentViewer - Found document:', foundDoc);
        
        if (foundDoc) {
          setDoc(foundDoc);
          setError(null);
        } else {
          console.log('DocumentViewer - Document not found in store');
          setError('Document not found. It may have been processed in a different session.');
        }
      } catch (err) {
        console.error('DocumentViewer - Error retrieving document:', err);
        setError('Error retrieving document.');
      }
      setLoading(false);
    } else {
      setError('No document ID provided.');
      setLoading(false);
    }
  }, [id]);

  const handleDownload = () => {
    if (!doc) return;
    
    console.log('Attempting to download document:', doc.id);
    const blobUrl = documentStore.getBlobUrl(doc.id, 'processed');
    console.log('Retrieved blob URL:', blobUrl);
    
    if (blobUrl) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `processed_${doc.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // If blob URL is not available, show a message
      alert('The processed PDF is not available for download. The document may have been processed in a different session.');
    }
  };

  const goToMainPage = () => {
    window.location.href = '/';
  };

  const refreshDocument = () => {
    if (id) {
      setLoading(true);
      setError(null);
      // Trigger a re-fetch
      setTimeout(() => {
        const foundDoc = documentStore.getDocument(id);
        if (foundDoc) {
          setDoc(foundDoc);
        } else {
          setError('Document still not found. Please return to the main page.');
        }
        setLoading(false);
      }, 500);
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <span>Document: {doc.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
            
            <div className="flex justify-center space-x-4">
              <Button onClick={handleDownload} size="lg">
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
                  Scan the QR code to access this document page instantly!
                </p>
                {doc.shareableUrl && (
                  <p className="mt-2 text-xs text-blue-600 break-all">
                    Direct link: {doc.shareableUrl}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DocumentViewer;
