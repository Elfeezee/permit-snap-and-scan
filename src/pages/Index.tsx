
import React, { useState } from 'react';
import { Upload, FileText, Barcode, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'processed';
  barcodeValue?: string;
  originalUrl?: string;
  processedUrl?: string;
}

const Index = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
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

  const handleFiles = (files: File[]) => {
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only PDF files.",
        variant: "destructive",
      });
      return;
    }

    pdfFiles.forEach(file => {
      const newDoc: Document = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        uploadDate: new Date().toLocaleDateString(),
        status: 'uploaded',
      };

      setDocuments(prev => [...prev, newDoc]);
      
      // Simulate processing
      simulateProcessing(newDoc.id);
    });

    toast({
      title: "Files Uploaded",
      description: `${pdfFiles.length} PDF file(s) uploaded successfully.`,
    });
  };

  const simulateProcessing = (docId: string) => {
    setProcessingProgress(0);
    
    // Update status to processing
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === docId ? { ...doc, status: 'processing' } : doc
      )
    );

    // Simulate progress
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Complete processing
          setDocuments(prevDocs => 
            prevDocs.map(doc => 
              doc.id === docId ? {
                ...doc,
                status: 'processed',
                barcodeValue: `BC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                processedUrl: `#processed/${doc.id}`
              } : doc
            )
          );

          toast({
            title: "Processing Complete",
            description: "Barcode has been generated and embedded in the document.",
          });

          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'uploaded':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusColor = (status: Document['status']) => {
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
                {processingProgress > 0 && processingProgress < 100 && (
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Processing document...</span>
                      <span>{processingProgress}%</span>
                    </div>
                    <Progress value={processingProgress} className="w-full" />
                  </div>
                )}
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
                                {doc.barcodeValue && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center space-x-1">
                                      <Barcode className="h-3 w-3" />
                                      <span>{doc.barcodeValue}</span>
                                    </span>
                                  </>
                                )}
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
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
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
                  Safely upload PDF documents with Firebase Storage integration
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Barcode className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Auto Barcode</h3>
                <p className="text-sm text-gray-600">
                  Automatically generate and embed unique barcodes on documents
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
