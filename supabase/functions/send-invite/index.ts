import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Auth & Role Verification
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing Auth Header", { status: 401, headers: corsHeaders });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !['admin', 'staff', 'instructor'].includes(profile.role)) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // 2. Logic Execution
  const { profile_id, template_slug } = await req.json();
  const { data: target } = await supabaseAdmin.from("profiles").select("email").eq("id", profile_id).single();
  if (!target) return new Response("Target not found", { status: 404, headers: corsHeaders });

  const { data: invite, error: iErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    target.email,
    { redirectTo: 'https://moto-crm-pi.vercel.app/auth/confirm' }
  );
  if (iErr) return new Response(JSON.stringify({ error: iErr.message }), { status: 400, headers: corsHeaders });

  const { data: template } = await supabaseAdmin.from("email_templates").select("subject, body_html").eq("slug", template_slug).single();
  if (!template) return new Response("Template not found", { status: 404, headers: corsHeaders });

  // 3. Send Email
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "MotoCRM <noreply@yourdomain.com>",
      to: [target.email],
      subject: template.subject,
      html: template.body_html.replace("{{invite_link}}", invite.user.email_confirm_link),
    }),
  });

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});



// import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
//   'Access-Control-Allow-Methods': 'POST, OPTIONS',
// };

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   const supabaseAdmin = createClient(
//     Deno.env.get("SUPABASE_URL")!,
//     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
//   );

//   const authHeader = req.headers.get("Authorization");
//   if (!authHeader) 
//     return new Response("Missing Auth Header", { status: 401, headers: corsHeaders });

//   const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
//     authHeader.replace("Bearer ", "")
//   );
//   if (authErr || !user) 
//     return new Response("Unauthorized", { status: 401, headers: corsHeaders });

//   const { data: profile } = await supabaseAdmin
//     .from("profiles")
//     .select("role")
//     .eq("id", user.id)
//     .single();

//   if (!profile || !['admin', 'staff', 'instructor'].includes(profile.role)) {
//     return new Response("Forbidden", { status: 403, headers: corsHeaders });
//   }

//   const { profile_id, template_slug } = await req.json();

//   const { data: target, error: tErr } = await supabaseAdmin
//     .from("profiles")
//     .select("email")
//     .eq("id", profile_id)
//     .single();

//   if (tErr || !target) 
//     return new Response("Target not found", { status: 404, headers: corsHeaders });

//   const { data: invite, error: iErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
//     target.email,
//     { redirectTo: 'https://moto-crm-pi.vercel.app/auth/confirm' }
//   );
//   if (iErr) 
//     return new Response(JSON.stringify({ error: iErr.message }), { status: 400, headers: corsHeaders });

//   const { data: template, error: tmplErr } = await supabaseAdmin
//     .from("email_templates")
//     .select("subject, body_html")
//     .eq("slug", template_slug)
//     .single();

//   if (tmplErr || !template)
//     return new Response("Template not found", { status: 404, headers: corsHeaders });

//   const html = template.body_html.replace("{{invite_link}}", invite.user.email_confirm_link);

//   const res = await fetch("https://api.resend.com/emails", {
//     method: "POST",
//     headers: {
//       "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       from: "MotoCRM <noreply@yourdomain.com>",
//       to: [target.email],
//       subject: template.subject,
//       html: html,
//     }),
//   });

//   const resData = await res.json();
  
//   if (!res.ok) {
//     return new Response(JSON.stringify({ error: "Resend failed", details: resData }), { 
//       status: 502, 
//       headers: { ...corsHeaders, "Content-Type": "application/json" } 
//     });
//   }

//   return new Response(JSON.stringify(resData), { 
//     status: 200, 
//     headers: { ...corsHeaders, "Content-Type": "application/json" } 
//   });
// });