
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, FileText, Download, CheckCircle, Clock, AlertCircle, Link, Printer, LogOut, User, Search, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { 
  ProcessedDocument,
  processDocumentWithSupabase,
  getProcessedDocumentUrl,
  downloadProcessedDocument
} from '@/utils/supabaseProcessor';
import { documentService, DocumentRecord } from '@/services/documentService';

const Index = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) {
      return documents;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return documents.filter(doc => 
      doc.id.toLowerCase().includes(query) ||
      doc.name.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  // Clear search functionality
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Load existing documents on component mount
  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  // Set up real-time subscription for document updates
  useEffect(() => {
    if (!user) return;

    const channel = documentService.subscribeToDocuments((payload) => {
      console.log('Real-time update:', payload);
      // Reload documents when there are changes
      loadDocuments();
    });

    return () => {
      if (channel) {
        documentService.unsubscribeFromDocuments(channel);
      }
    };
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Get all documents for admin access (all signed-in users are admins)
      const { data: dbDocs, error } = await documentService.getDocuments();
      
      if (error) {
        console.error('Error loading documents:', error);
        toast({
          title: "Error Loading Documents",
          description: "Failed to load your documents.",
          variant: "destructive",
        });
        return;
      }

      if (dbDocs) {
        // Convert database records to ProcessedDocument format
        const processedDocs: ProcessedDocument[] = dbDocs.map(dbDoc => ({
          id: dbDoc.id,
          name: dbDoc.name,
          size: `${dbDoc.size_mb} MB`,
          uploadDate: new Date(dbDoc.upload_date).toLocaleDateString(),
          status: dbDoc.status,
          shareableUrl: dbDoc.shareable_url,
          dbRecord: dbDoc
        }));
        
        setDocuments(processedDocs);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed');
    if (e.target.files) {
      const files = Array.from(e.target.files);
      console.log('Selected files:', files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload documents.",
        variant: "destructive",
      });
      return;
    }

    console.log('Processing files:', files);
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
      // Start processing each file
      processDocument(file);
    }

    toast({
      title: "Files Uploaded",
      description: `${pdfFiles.length} PDF file(s) uploaded successfully. Processing started.`,
    });
  };

  const processDocument = async (file: File) => {
    if (!user) return;

    const tempId = `temp-${Date.now()}`;
    
    try {
      console.log('Starting processing for file:', file.name);
      
      // Set initial progress
      setProcessingProgress(prev => ({ ...prev, [tempId]: 0 }));

      // Process document using Supabase
      const processedDoc = await processDocumentWithSupabase(
        file,
        user.id,
        (progress) => {
          setProcessingProgress(prev => ({ ...prev, [tempId]: progress }));
        }
      );

      console.log('Document processed successfully:', processedDoc);

      // Reload documents to get the latest data
      await loadDocuments();

      // Clean up progress tracking
      setTimeout(() => {
        setProcessingProgress(prev => {
          const newState = { ...prev };
          delete newState[tempId];
          return newState;
        });
      }, 1000);

      toast({
        title: "Processing Complete",
        description: `QR code embedded in ${processedDoc.name}.`,
      });

    } catch (error) {
      console.error('Error processing document:', error);
      
      // Clean up progress tracking
      setProcessingProgress(prev => {
        const newState = { ...prev };
        delete newState[tempId];
        return newState;
      });

      toast({
        title: "Processing Failed",
        description: "Failed to process the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = async (doc: ProcessedDocument) => {
    if (!doc.dbRecord?.processed_file_path) {
      toast({
        title: "File Not Available",
        description: "The processed file is not available for printing.",
        variant: "destructive",
      });
      return;
    }

    const url = getProcessedDocumentUrl(doc.dbRecord);
    if (url) {
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleDownload = async (doc: ProcessedDocument) => {
    if (!doc.dbRecord) {
      toast({
        title: "File Not Available",
        description: "The processed file is not available for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = await downloadProcessedDocument(doc.dbRecord);
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
        throw new Error('Failed to download file');
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the processed file.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
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

  const handleDelete = async (doc: ProcessedDocument) => {
    if (!doc.dbRecord) return;

    if (!confirm(`Are you sure you want to delete "${doc.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Immediately remove from UI for instant feedback
      setDocuments(prev => prev.filter(d => d.id !== doc.id));

      const { error } = await documentService.deleteDocument(doc.dbRecord.id);
      
      if (error) {
        // If deletion failed, restore the document to the UI
        setDocuments(prev => [...prev, doc]);
        throw error;
      }

      toast({
        title: "Document Deleted",
        description: "The document has been successfully deleted.",
      });

      // Reload documents to ensure consistency (the real-time update should handle this too)
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive",
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

  // Redirect to auth if not logged in (after all hooks have been called)
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

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
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
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
                    onChange={handleFileInputChange}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Button type="button" asChild>
                      <span>Select Files</span>
                    </Button>
                  </label>
                </div>

                {/* Processing Progress */}
                {Object.entries(processingProgress).map(([tempId, progress]) => (
                  <div key={tempId} className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Processing document...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                ))}
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
                
                {/* Search Bar */}
                <div className="flex items-center space-x-2 pt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by Document ID or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading documents...</p>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    {searchQuery ? (
                      <>
                        <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No documents found</h3>
                        <p className="text-gray-500">No documents match your search query "{searchQuery}"</p>
                        <Button variant="outline" onClick={clearSearch} className="mt-4">
                          Clear Search
                        </Button>
                      </>
                    ) : (
                      <>
                        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No documents uploaded</h3>
                        <p className="text-gray-500">Upload PDF files to start processing</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDocuments.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="bg-red-100 p-2 rounded">
                              <FileText className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-1">
                                <h4 className="font-medium text-gray-900">{doc.name}</h4>
                                <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                                  {doc.id}
                                </Badge>
                              </div>
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
                            <div className="flex space-x-2">
                              {doc.status === 'processed' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handlePrint(doc)} title="Print PDF">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDownload(doc)} title="Download PDF">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => copyShareableLink(doc)} title="Copy shareable link">
                                    <Link className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleDelete(doc)} 
                                title="Delete document"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
                <h3 className="font-semibold text-gray-900 mb-2">QR Integration</h3>
                <p className="text-sm text-gray-600">
                  Automatically generate scannable QR codes for document access
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
