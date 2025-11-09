
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, AlertCircle, ExternalLink, QrCode, RefreshCw, Eye } from 'lucide-react';
import { documentService, DocumentRecord } from '@/services/documentService';
import { downloadProcessedDocument, getProcessedDocumentUrl,generateQRCode } from '@/utils/supabaseProcessor';
import { unifiedDocumentService } from '@/services/unifiedDocumentService';
const DocumentViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = async (documentId: string) => {
    console.log('DocumentViewer - Loading document with ID:', documentId);
    console.log('DocumentViewer - loadDocument called with ID:', documentId);
    
    try {
      const { data: foundDoc, error: loadError } = await unifiedDocumentService.getDocument(documentId);

      if (loadError) {
        console.error('DocumentViewer - Error loading document:', loadError);
        setError('Error loading document from database.');
        return;
      }
      
      if (foundDoc) {
        console.log('DocumentViewer - Successfully loaded document:', foundDoc.name);
        setDoc(foundDoc);
        setError(null);
        console.log('DocumentViewer - google_maps_link:', foundDoc.google_maps_link);
      } else {
        console.log('DocumentViewer - Document not found');
        setError('Document not found. It may have been deleted or you may not have permission to view it.');
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
  }, [id]);

  const handleDownload = async () => {
    if (!doc) return;
    
    console.log('Attempting to download document:', doc.id);
    
    try {
      const blob = await downloadProcessedDocument(doc);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `processed_${doc.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert('The processed PDF is not available for download.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the document. Please try again.');
    }
  };

  const handleDownloadQRCode = async () => {
    if (!doc?.shareable_url) {
      alert('Shareable URL is not available.');
      return;
    }

    try {
      const qrCodeDataUrl = await generateQRCode(doc.shareable_url);
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = 'qrcode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download the QR code. Please try again.');
    }
  };

  const handlePreview = async () => {
    if (!doc) return;
    
    console.log('Attempting to preview document:', doc.id);
    
    try {
      const blob = await downloadProcessedDocument(doc);
      if (blob) {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Note: URL will be automatically cleaned up when the tab is closed
      } else {
        alert('The processed PDF is not available for preview.');
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview the document. Please try again.');
    }
  };

  const goToMainPage = () => {
    window.location.href = '/';
  };

  const refreshDocument = () => {
    if (id) {
      setLoading(true);
      setError(null);
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
                <span className="font-medium text-gray-700">Approved Date:</span>
                <span className="ml-2 text-gray-600">{new Date(doc.upload_date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className="ml-2 text-green-600 font-medium">
                  {doc.status === 'processed' ? 'VERIFIED' : doc.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Document ID:</span>
                <span className="ml-2 text-gray-600 font-mono text-xs">{doc.id}</span>
              </div>
              {doc.processed_date && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Processed Date & Time:</span>
                  <span className="ml-2 text-gray-600">{new Date(doc.processed_date).toLocaleString()}</span>
                </div>
              )}
            </div>
            
            {(doc as DocumentRecord).google_maps_link && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Location Link:</span>
                  <a href={(doc as DocumentRecord).google_maps_link} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                    {(doc as DocumentRecord).google_maps_link}
                  </a>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button onClick={handlePreview} size="lg" variant="outline">
                <Eye className="h-5 w-5 mr-2" />
                Preview
              </Button>
              <Button onClick={handleDownload} size="lg">
                <Download className="h-5 w-5 mr-2" />
                View Permit
              </Button>
         
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                About This Document
              </h3>
              <div className="text-sm space-y-2">
                <p className="text-green-600 font-medium">
                  This Permit is original and issued by kasupda as authentic.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DocumentViewer;
