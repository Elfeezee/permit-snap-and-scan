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
    const { folderId, fileName, fileData, mimeType, makePublic } = await req.json();

    if (!folderId || !fileName || !fileData) {
      throw new Error('Missing required parameters');
    }

    // Get service account from environment
    let serviceAccountJson = Deno.env.get('GOOGLE_DRIVE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('Google Drive service account not configured');
    }

    console.log('Raw secret length:', serviceAccountJson.length);
    console.log('First 50 chars:', serviceAccountJson.substring(0, 50));

    // Clean up the string - remove any extra quotes or whitespace
    serviceAccountJson = serviceAccountJson.trim();
    
    // If the entire string is wrapped in quotes, remove them
    if ((serviceAccountJson.startsWith('"') && serviceAccountJson.endsWith('"')) ||
        (serviceAccountJson.startsWith("'") && serviceAccountJson.endsWith("'"))) {
      serviceAccountJson = serviceAccountJson.slice(1, -1);
    }

    const credentials = JSON.parse(serviceAccountJson);

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Decode base64 file data
    const buffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType || 'application/pdf',
      body: new Blob([buffer]),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, size, createdTime',
    });

    const fileId = response.data.id;

    // Make file public if requested
    if (makePublic && fileId) {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: response.data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
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
