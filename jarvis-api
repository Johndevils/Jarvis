// Cloudflare Worker for JARVIS AI Backend
// Deploy this to your Cloudflare Workers account

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check endpoint
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'J.A.R.V.I.S. online' }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        });
      }

      // AI query endpoint
      if (path === '/api/query' && request.method === 'POST') {
        return await handleAIQuery(request, env);
      }

      // Token validation endpoint (for initial setup)
      if (path === '/api/validate-token' && request.method === 'POST') {
        return await validateToken(request, env);
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: getCORSHeaders(),
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: getCORSHeaders(),
      });
    }
  }
};

// Handle AI queries to Hugging Face
async function handleAIQuery(request, env) {
  const { query } = await request.json();

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query is required' }), {
      status: 400,
      headers: getCORSHeaders(),
    });
  }

  // Get token from environment variables (most secure)
  let token = env.HUGGINGFACE_TOKEN;

  // Fallback to KV storage if env var not set
  if (!token && env.JARVIS_KV) {
    token = await env.JARVIS_KV.get('huggingface_token');
  }

  if (!token) {
    return new Response(JSON.stringify({ 
      error: 'API token not configured',
      message: 'Please configure HUGGINGFACE_TOKEN environment variable'
    }), {
      status: 500,
      headers: getCORSHeaders(),
    });
  }

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/deepseek-ai/deepseek-v3", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `You are Jarvis. Be brief, precise, and witty. Address me as Sir. User query: ${query}`,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Hugging Face API error:', errorData);
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data[0]?.generated_text || "I'm sorry, Sir. I couldn't process that request.";
    
    // Extract just the response part
    const responseText = aiResponse.includes("User query:") 
      ? aiResponse.split("User query:")[1].trim() 
      : aiResponse;

    return new Response(JSON.stringify({ 
      response: responseText,
      status: 'success'
    }), {
      headers: getCORSHeaders(),
    });

  } catch (error) {
    console.error('AI Query error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to query AI',
      message: error.message
    }), {
      status: 500,
      headers: getCORSHeaders(),
    });
  }
}

// Validate token configuration
async function validateToken(request, env) {
  let token = env.HUGGINGFACE_TOKEN;

  if (!token && env.JARVIS_KV) {
    token = await env.JARVIS_KV.get('huggingface_token');
  }

  if (!token) {
    return new Response(JSON.stringify({ 
      valid: false,
      message: 'No token configured'
    }), {
      headers: getCORSHeaders(),
    });
  }

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/deepseek-ai/deepseek-v3", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: "test",
        parameters: {
          max_new_tokens: 1,
        }
      }),
    });

    return new Response(JSON.stringify({ 
      valid: response.ok,
      message: response.ok ? 'Token is valid' : 'Token validation failed'
    }), {
      headers: getCORSHeaders(),
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      valid: false,
      message: error.message
    }), {
      headers: getCORSHeaders(),
    });
  }
}

// CORS headers helper
function getCORSHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Handle CORS preflight
function handleCORS() {
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders(),
  });
}
