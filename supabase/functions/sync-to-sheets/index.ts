import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get Google Service Account credentials
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKey) {
      throw new Error('Google Service Account Key not found')
    }

    const credentials = JSON.parse(serviceAccountKey)
    
    // Create JWT for Google Sheets API
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    }

    // Import key and sign JWT
    const encoder = new TextEncoder()
    const keyData = encoder.encode(credentials.private_key)
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    )

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const dataToSign = `${headerB64}.${payloadB64}`
    
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(dataToSign)
    )
    
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    const jwt = `${dataToSign}.${signatureB64}`

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    const tokenData = await tokenResponse.json()
    
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token')
    }

    // Fetch chat data from database
    const { data: rooms } = await supabaseClient
      .from('chat_rooms')
      .select('*')

    const { data: messages } = await supabaseClient
      .from('messages')
      .select('*, chat_rooms(room_name)')
      .order('created_at', { ascending: false })
      .limit(100)

    // Prepare data for Google Sheets
    const sheetData = [
      ['Room Name', 'User Name', 'Message', 'Created At', 'Room Type']
    ]

    messages?.forEach(message => {
      sheetData.push([
        message.chat_rooms?.room_name || 'Unknown',
        message.user_name,
        message.message || '',
        new Date(message.created_at).toLocaleString(),
        'Chat Message'
      ])
    })

    // Update Google Sheet
    const spreadsheetId = '1C6pZibMJWg1BsNAStsyoNMgn0lPka5WPQmt-a-a_FUs'
    const range = 'Sheet1!A1:E' + (sheetData.length)
    
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: sheetData
        })
      }
    )

    const sheetsResult = await sheetsResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedCells: sheetsResult.updatedCells,
        messageCount: messages?.length || 0 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error syncing to sheets:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})