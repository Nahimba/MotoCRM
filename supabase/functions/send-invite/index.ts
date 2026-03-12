
// create or replace function get_auth_user_status(p_email text)
// returns table(user_id uuid, confirmed_at timestamptz)
// language plpgsql
// security definer
// as $$
// begin
//   return query
//   select id, email_confirmed_at 
//   from auth.users 
//   where email = p_email 
//   limit 1;
// end;
// $$;


import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Auth Check
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Unauthorized")
    
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authErr || !user) throw new Error("Unauthorized")

    // 2. Extract Data
    const { profile_id } = await req.json()
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", profile_id)
      .single()
    if (!target) throw new Error("Target student not found")

    // 3. Check status
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile_id)
    if (authUser.user?.confirmed_at) {
      return new Response(JSON.stringify({ status: "already_confirmed" }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      })
    }

    // 4. Send via Supabase Built-in Mailer
    // This uses the "Magic Link" or "Invite" template configured in your Dashboard
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(target.email, {
      redirectTo: 'https://moto-crm-pi.vercel.app/ua/auth/confirm',
      data: { profile_id: profile_id } 
    })

    if (inviteErr) throw new Error(`Mailer error: ${inviteErr.message}`)

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})


// import { createClient } from 'jsr:@supabase/supabase-js@2'

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// }

// Deno.serve(async (req) => {
//   if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

//   try {
//     const supabaseAdmin = createClient(
//       Deno.env.get("SUPABASE_URL")!,
//       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
//     )

//     // 1. Auth Check
//     const authHeader = req.headers.get("Authorization")
//     if (!authHeader) throw new Error("Unauthorized")
    
//     const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""))
//     if (authErr || !user) throw new Error("Unauthorized")

//     // 2. Logic: Fetch Target Student
//     const { profile_id, template_slug } = await req.json()
//     const { data: target } = await supabaseAdmin
//       .from("profiles")
//       .select("email, first_name")
//       .eq("id", profile_id)
//       .single()
//     if (!target) throw new Error("Target student not found")

//     // 3. Check status via RPC (to avoid exposing auth schema)
//     const { data: userStatus, error: rpcErr } = await supabaseAdmin.rpc("get_auth_user_status", { 
//       p_email: target.email 
//     })

//     if (rpcErr || !userStatus || userStatus.length === 0) {
//       throw new Error("User does not exist in the system.")
//     }

//     // 4. Determine Action
//     const userData = userStatus[0]
    
//     if (userData.confirmed_at !== null) {
//       // User is already active. Return a specific status code/message
//       return new Response(JSON.stringify({ status: "already_confirmed" }), { 
//         status: 200, 
//         headers: { ...corsHeaders, "Content-Type": "application/json" } 
//       })
//     }

//     // 5. User is pending: Send Magic Link
//     const { data: linkData, error: lErr } = await supabaseAdmin.auth.admin.generateLink({
//       type: 'magiclink',
//       email: target.email,
//       options: { redirectTo: 'https://moto-crm-pi.vercel.app/ua/auth/confirm' }
//     })
//     if (lErr) throw new Error(`Link generation error: ${lErr.message}`)

//     // 6. Send via Resend
//     const { data: template } = await supabaseAdmin.from("email_templates").select("subject, body_html").eq("slug", template_slug).single()
//     if (!template) throw new Error("Template not found")

//     const res = await fetch("https://api.resend.com/emails", {
//       method: "POST",
//       headers: { 
//         "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`, 
//         "Content-Type": "application/json" 
//       },
//       body: JSON.stringify({
//         from: "MotoCRM <noreply@yourdomain.com>",
//         to: [target.email],
//         subject: template.subject,
//         html: template.body_html
//           .replace("{{name}}", target.first_name || "User")
//           .replace("{{invite_link}}", linkData.properties.action_link),
//       }),
//     })

//     if (!res.ok) throw new Error("Failed to send email")

//     return new Response(JSON.stringify({ success: true }), { 
//       status: 200, 
//       headers: { ...corsHeaders, "Content-Type": "application/json" } 
//     })

//   } catch (err: any) {
//     return new Response(JSON.stringify({ error: err.message }), { 
//       status: 400, 
//       headers: { ...corsHeaders, "Content-Type": "application/json" } 
//     })
//   }
// })








// import { createClient } from 'jsr:@supabase/supabase-js@2'

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// }

// Deno.serve(async (req) => {
//   // Handle CORS
//   if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

//   try {
//     const supabaseAdmin = createClient(
//       Deno.env.get("SUPABASE_URL")!,
//       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
//     )

//     // 1. Verify Request
//     const authHeader = req.headers.get("Authorization")
//     if (!authHeader) throw new Error("Unauthorized")
    
//     const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""))
//     if (authErr || !user) throw new Error("Unauthorized")

//     // 2. Role Check
//     const { data: profile } = await supabaseAdmin
//       .from("profiles")
//       .select("role, first_name")
//       .eq("id", user.id)
//       .single()

//     if (!profile || !['admin', 'staff', 'instructor'].includes(profile.role)) {
//       throw new Error("Forbidden")
//     }

//     // 3. Logic
//     const { profile_id, template_slug } = await req.json()

//     // Get target student details
//     const { data: target } = await supabaseAdmin
//       .from("profiles")
//       .select("email, first_name, last_name")
//       .eq("id", profile_id)
//       .single()

//     if (!target) throw new Error("Target student profile not found")

//     // Invite User
//     const { data: invite, error: iErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
//       target.email,
//       { redirectTo: 'https://moto-crm-pi.vercel.app/ua/auth/confirm' }
//     )
//     if (iErr) throw new Error(iErr.message)

//     // Get email template
//     const { data: template } = await supabaseAdmin
//       .from("email_templates")
//       .select("subject, body_html")
//       .eq("slug", template_slug)
//       .single()

//     if (!template) throw new Error("Email template not found")

//     // Prepare Name Data
//     const targetFirstName = target.first_name || "Студенте"
//     const targetFullName = `${target.first_name || ''} ${target.last_name || ''}`.trim()

//     // 4. Invite User with Metadata
//     // This adds full_name to auth.users raw_user_meta_data
//     const { data: invite, error: iErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
//       target.email,
//       { 
//         redirectTo: 'https://moto-crm-pi.vercel.app/ua/auth/confirm',
//         data: { 
//           full_name: targetFullName,
//           first_name: targetFirstName
//         }
//       }
//     )
//     if (iErr) throw new Error(`Auth Invite Error: ${iErr.message}`)


//     // 5. LINKING STEP: Update the existing profile with the new Auth ID
//     // This ensures your 'profiles' and 'auth.users' share the same UUID
//     const { error: updateErr } = await supabaseAdmin
//     .from("profiles")
//     .update({ id: invite.user.id }) // Sync the IDs
//     .eq("id", profile_id)

//     if (updateErr) console.error("Linking Error:", updateErr.message)


//     // 6. Send Email via Resend
//     const res = await fetch("https://api.resend.com/emails", {
//       method: "POST",
//       headers: { 
//         "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`, 
//         "Content-Type": "application/json" 
//       },
//       body: JSON.stringify({
//         from: "MotoCRM <noreply@yourdomain.com>", // Replace with your verified Resend domain
//         to: [target.email],
//         subject: template.subject,
//         html: template.body_html
//           .replace("{{name}}", targetFirstName)
//           .replace("{{invite_link}}", invite.user.email_confirm_link),
//       }),
//     })

//     if (!res.ok) {
//       const errorData = await res.json()
//       throw new Error(`Resend Error: ${JSON.stringify(errorData)}`)
//     }

//     return new Response(JSON.stringify({ success: true }), { 
//       status: 200, 
//       headers: { ...corsHeaders, "Content-Type": "application/json" } 
//     })

//   } catch (err) {
//     console.error(err.message)
//     return new Response(JSON.stringify({ error: err.message }), { 
//       status: 400, 
//       headers: { ...corsHeaders, "Content-Type": "application/json" } 
//     })
//   }
// })







// {
//   "profile_id": "cff1186b-d393-4442-8560-ed3757992428",
//   "template_slug": "invitation_email_ua" 
// }




//   const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
//   if (authErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });



//http://localhost:3000/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=


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