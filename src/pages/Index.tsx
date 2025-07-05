
import React, { useState } from 'react';
import { Upload, FileText, Download, CheckCircle, Clock, AlertCircle, Link, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  ProcessedDocument, 
  generateUniqueId, 
  generateQRCode, 
  generateBarcode,
  embedCodesInPDF, 
  createShareableUrl 
} from '@/utils/pdfProcessor';
import { documentStore } from '@/utils/documentStore';

const Index = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only PDF files.",
        variant: "destructive",
      });
      return;
    }

    for (const file of pdfFiles) {
      const newDoc: ProcessedDocument = {
        id: generateUniqueId(),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        uploadDate: new Date().toLocaleDateString(),
        status: 'uploaded',
        originalBlob: file,
      };

      setDocuments(prev => [...prev, newDoc]);
      documentStore.storeDocument(newDoc);
      
      // Start processing
      processDocument(newDoc, file);
    }

    toast({
      title: "Files Uploaded",
      description: `${pdfFiles.length} PDF file(s) uploaded successfully. Processing started.`,
    });
  };

  const processDocument = async (doc: ProcessedDocument, file: File) => {
    try {
      // Update status to processing
      updateDocumentStatus(doc.id, 'processing');
      setProcessingProgress(prev => ({ ...prev, [doc.id]: 0 }));

      // Create shareable URL
      const shareableUrl = createShareableUrl(doc.id);
      setProcessingProgress(prev => ({ ...prev, [doc.id]: 25 }));

      // Generate QR code for shareable link
      const qrCodeDataUrl = await generateQRCode(shareableUrl);
      setProcessingProgress(prev => ({ ...prev, [doc.id]: 50 }));

      // Generate barcode with the same shareable URL
      const barcodeDataUrl = await generateBarcode(shareableUrl);
      setProcessingProgress(prev => ({ ...prev, [doc.id]: 75 }));

      // Embed both QR code and barcode in PDF
      const processedBlob = await embedCodesInPDF(file, qrCodeDataUrl, barcodeDataUrl);
      setProcessingProgress(prev => ({ ...prev, [doc.id]: 100 }));

      // Store blob URLs
      documentStore.storeBlobUrl(doc.id, 'original', file);
      documentStore.storeBlobUrl(doc.id, 'processed', processedBlob);

      // Update document with processing results
      const updatedDoc: ProcessedDocument = {
        ...doc,
        status: 'processed',
        shareableUrl,
        barcodeData: shareableUrl,
        processedBlob
      };

      updateDocument(doc.id, updatedDoc);
      documentStore.updateDocument(doc.id, updatedDoc);

      // Clean up progress tracking
      setTimeout(() => {
        setProcessingProgress(prev => {
          const newState = { ...prev };
          delete newState[doc.id];
          return newState;
        });
      }, 1000);

      toast({
        title: "Processing Complete",
        description: `QR code and barcode embedded in ${doc.name}. Barcode links to the document page.`,
      });

    } catch (error) {
      console.error('Error processing document:', error);
      updateDocumentStatus(doc.id, 'uploaded');
      toast({
        title: "Processing Failed",
        description: "Failed to process the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateDocumentStatus = (docId: string, status: ProcessedDocument['status']) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === docId ? { ...doc, status } : doc
      )
    );
  };

  const updateDocument = (docId: string, updatedDoc: ProcessedDocument) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === docId ? updatedDoc : doc
      )
    );
  };

  const handlePrint = (doc: ProcessedDocument) => {
    const blobUrl = documentStore.getBlobUrl(doc.id, 'processed');
    if (blobUrl) {
      const printWindow = window.open(blobUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleDownload = (doc: ProcessedDocument) => {
    const blobUrl = documentStore.getBlobUrl(doc.id, 'processed');
    if (blobUrl) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `processed_${doc.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyShareableLink = (doc: ProcessedDocument) => {
    if (doc.shareableUrl) {
      navigator.clipboard.writeText(doc.shareableUrl);
      toast({
        title: "Link Copied",
        description: "Shareable link copied to clipboard.",
      });
    }
  };

  const getStatusIcon = (status: ProcessedDocument['status']) => {
    switch (status) {
      case 'uploaded':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusColor = (status: ProcessedDocument['status']) => {
    switch (status) {
      case 'uploaded':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'processed':
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Permit Processing System</h1>
                <p className="text-sm text-gray-600">Upload, process, and manage permit documents</p>
              </div>
            </div>
            <Button variant="outline" className="hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />
              Export Reports
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Documents</span>
                </CardTitle>
                <CardDescription>
                  Upload PDF permit documents for processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drop PDF files here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                  />
                  <label htmlFor="file-upload">
                    <Button className="cursor-pointer">
                      Select Files
                    </Button>
                  </label>
                </div>

                {/* Processing Progress */}
                {Object.entries(processingProgress).map(([docId, progress]) => {
                  const doc = documents.find(d => d.id === docId);
                  return doc ? (
                    <div key={docId} className="mt-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Processing {doc.name}...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                    </div>
                  ) : null;
                })}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {documents.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Documents</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {documents.filter(d => d.status === 'processed').length}
                  </div>
                  <div className="text-sm text-gray-600">Processed</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Documents List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Document Queue</span>
                </CardTitle>
                <CardDescription>
                  Track the status of your uploaded documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No documents uploaded</h3>
                    <p className="text-gray-500">Upload PDF files to start processing</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="bg-red-100 p-2 rounded">
                              <FileText className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{doc.name}</h4>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                <span>{doc.size}</span>
                                <span>•</span>
                                <span>{doc.uploadDate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={getStatusColor(doc.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(doc.status)}
                                <span className="capitalize">{doc.status}</span>
                              </div>
                            </Badge>
                            {doc.status === 'processed' && (
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handlePrint(doc)} title="Print PDF">
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDownload(doc)} title="Download PDF">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => copyShareableLink(doc)} title="Copy shareable link">
                                  <Link className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">System Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Secure Upload</h3>
                <p className="text-sm text-gray-600">
                  Safely upload PDF documents with secure processing
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Barcode & QR Integration</h3>
                <p className="text-sm text-gray-600">
                  Automatically generate scannable barcodes and QR codes for document access
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Download className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Ready to Print</h3>
                <p className="text-sm text-gray-600">
                  Download processed documents ready for immediate printing
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
