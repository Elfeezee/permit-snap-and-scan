import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId || typeof documentId !== "string") {
      return new Response(JSON.stringify({ error: "Document ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id,name,size_mb,status,created_at,updated_at,processed_date,processed_file_path,shareable_url,google_maps_link")
      .eq("id", documentId)
      .eq("status", "processed")
      .maybeSingle();

    if (documentError) {
      console.error("Error loading shared document:", documentError);
      return new Response(JSON.stringify({ error: "Error loading document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!document?.processed_file_path) {
      return new Response(JSON.stringify({ document: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from("documents-processed")
      .createSignedUrl(document.processed_file_path, 60 * 5);

    if (signedUrlError) {
      console.error("Error creating shared file URL:", signedUrlError);
      return new Response(JSON.stringify({ error: "Error opening document file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        document: {
          id: document.id,
          name: document.name,
          size_mb: document.size_mb,
          status: document.status,
          upload_date: document.created_at,
          created_at: document.created_at,
          updated_at: document.updated_at,
          processed_date: document.processed_date,
          shareable_url: document.shareable_url,
          google_maps_link: document.google_maps_link,
          public_file_url: signedUrl.signedUrl,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in shared-document function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});