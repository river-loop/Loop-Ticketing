// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
//import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";
//const event_manager_url = 'https://ticketing-back-office-reztop.flutterflow.app';
const event_manager_url = 'https://kick-off-event-manager-3mgfi7.flutterflow.app';

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405,headers: {
        "Access-Control-Allow-Origin": event_manager_url, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      }  });
    }

    const { bucketName, folderPath } = await req.json();

    if (!bucketName || !folderPath) {
      return new Response("Invalid request body", { status: 400,headers: {
        "Access-Control-Allow-Origin": event_manager_url, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      }  });
    }

    // List all files in the folder
    const { data: fileList, error: listError } = await supabase
      .storage
      .from(bucketName)
      .list(folderPath, { limit: 100 }); // Set limit or use pagination if more than 100 files

    if (listError || !fileList || fileList.length === 0) {
      return new Response(
        listError ? `Error listing files: ${listError.message}` : "No files found",
        { status: 500,headers: {
          "Access-Control-Allow-Origin": event_manager_url, // Allow only your specific domain
          "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", // Allowed methods
          "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
        } }
      );
    }

    // Get the full paths of all files
    const filePaths = fileList.map((file) => `${folderPath}/${file.name}`);

    // Delete all files under the folder
    const { error: deleteError } = await supabase
      .storage
      .from(bucketName)
      .remove(filePaths);

    if (deleteError) {
      return new Response(`Failed to delete files: ${deleteError.message}`, { status: 500,headers: {
        "Access-Control-Allow-Origin": event_manager_url, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      } });
    }

    return new Response("All files deleted successfully", { status: 200,headers: {
      "Access-Control-Allow-Origin": event_manager_url, // Allow only your specific domain
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", // Allowed methods
      "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
    } });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500,headers: {
      "Access-Control-Allow-Origin": event_manager_url, // Allow only your specific domain
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", // Allowed methods
      "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
    } });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/deleteeventphotos' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
