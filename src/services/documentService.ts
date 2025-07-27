import { supabase } from '@/integrations/supabase/client';

export interface DocumentRecord {
  id: string;
  name: string;
  size_mb: number;
  status: 'uploaded' | 'processing' | 'processed';
  upload_date: string;
  processed_date?: string;
  user_id?: string;
  original_file_path?: string;
  processed_file_path?: string;
  shareable_url?: string;
  created_at: string;
  updated_at: string;
  google_maps_link?: string;
}

export class DocumentService {
  // Generate a new KASUPDA permit ID
  async generateKasupdaPermitId(): Promise<{ data: string | null; error: any }> {
    const { data, error } = await supabase.rpc('generate_kasupda_permit_id');
    return { data, error };
  }

  // Create a new document record
  async createDocument(data: {
    name: string;
    size_mb: number;
    user_id?: string;
    original_file_path?: string;
    google_maps_link?: string;
  }): Promise<{ data: DocumentRecord | null; error: any }> {
    // Generate the custom ID first
    const { data: customId, error: idError } = await this.generateKasupdaPermitId();
    if (idError || !customId) {
      return { data: null, error: idError || new Error('Failed to generate ID') };
    }

    const { data: doc, error } = await supabase
      .from('documents')
      .insert([{
        id: customId,
        name: data.name,
        size_mb: data.size_mb,
        user_id: data.user_id,
        original_file_path: data.original_file_path,
        google_maps_link: data.google_maps_link,
        status: 'uploaded' as const
      }])
      .select()
      .single();

    return { data: doc as DocumentRecord, error };
  }

  // Get all documents for current user
  async getDocuments(userId?: string): Promise<{ data: DocumentRecord[] | null; error: any }> {
    let query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    return { data: data as DocumentRecord[], error };
  }

  // Get a single document by ID
  async getDocument(id: string): Promise<{ data: DocumentRecord | null; error: any }> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as DocumentRecord, error };
  }

  // Update document status and metadata
  async updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<{ data: DocumentRecord | null; error: any }> {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data: data as DocumentRecord, error };
  }

  // Delete a document
  async deleteDocument(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    return { error };
  }

  // Upload file to storage
  async uploadFile(
    bucket: 'documents-original' | 'documents-processed',
    path: string,
    file: File
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    return { data, error };
  }

  // Get file URL from storage
  getFileUrl(bucket: 'documents-original' | 'documents-processed', path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Download file from storage
  async downloadFile(bucket: 'documents-original' | 'documents-processed', path: string): Promise<{ data: Blob | null; error: any }> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    return { data, error };
  }

  // Delete file from storage
  async deleteFile(bucket: 'documents-original' | 'documents-processed', path: string): Promise<{ error: any }> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    return { error };
  }

  // Subscribe to real-time document updates
  subscribeToDocuments(callback: (payload: any) => void, userId?: string) {
    let channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        callback
      );

    return channel.subscribe();
  }

  // Unsubscribe from real-time updates
  unsubscribeFromDocuments(channel: any) {
    return supabase.removeChannel(channel);
  }
}

export const documentService = new DocumentService();