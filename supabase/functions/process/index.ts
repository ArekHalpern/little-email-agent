import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { processMarkdown } from "../_lib/markdown-parser.js";

serve(async (req: Request) => {
  try {
    // These are automatically injected
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'No authorization header passed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          authorization,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const { document_id } = await req.json();

    const { data: document } = await supabase
      .from('documents_with_storage_path')
      .select()
      .eq('id', document_id)
      .single();

    if (!document?.storage_object_path) {
      return new Response(
        JSON.stringify({ error: 'Failed to find uploaded document' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: file } = await supabase.storage
      .from('files')
      .download(document.storage_object_path);

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Failed to download storage object' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const fileContents = await file.text();

    const processedMd = processMarkdown(fileContents);

    const { error } = await supabase.from('document_sections').insert(
      processedMd.sections.map(({ content }) => ({
        document_id,
        content,
      }))
    );

    if (error) {
      console.error(error);
      return new Response(
        JSON.stringify({ error: 'Failed to save document sections' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Saved ${processedMd.sections.length} sections for file '${document.name}'`
    );

    return new Response(null, {
      status: 204,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});