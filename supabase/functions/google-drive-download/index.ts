import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@^144.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileId } = await req.json();

    if (!fileId) {
      throw new Error('File ID is required');
    }

    let serviceAccountJson = Deno.env.get('GOOGLE_DRIVE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('Google Drive service account not configured');
    }

    // Handle case where secret might be double-encoded as a string
    if (serviceAccountJson.startsWith('"') || serviceAccountJson.startsWith("'")) {
      serviceAccountJson = JSON.parse(serviceAccountJson);
    }

    const credentials = JSON.parse(serviceAccountJson);

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media',
      },
      {
        responseType: 'arraybuffer',
      }
    );

    // Convert to base64 for transport
    const base64Data = btoa(
      new Uint8Array(response.data as ArrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: base64Data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error downloading file:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
