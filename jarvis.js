// JARVIS Backend - Secure Version with Origin Restriction
export default {
  async fetch(request, env, ctx) {
    // Define allowed origins
    const ALLOWED_ORIGINS = [
      'https://jarvis-997.pages.dev',
      'https://jarvis-997.pages.dev/',  // With trailing slash
    ];

    // Get the origin from the request
    const origin = request.headers.get('Origin');
    
    // Check if the origin is allowed
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || 
                           (!origin && request.headers.get('User-Agent')?.includes('Mozilla'));
    
    // Handle CORS preflight requests for allowed origins
    if (request.method === 'OPTIONS') {
      if (isAllowedOrigin) {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          }
        });
      } else {
        return new Response(null, { status: 403 });
      }
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // For non-OPTIONS requests, check origin
    if (!isAllowedOrigin) {
      return new Response(JSON.stringify({ 
        error: 'Access denied',
        message: 'This API can only be accessed from https://jarvis-997.pages.dev/',
        debug: `Origin: ${origin || 'none'}`
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    try {
      // Health check - simple and reliable
      if (path === '/health') {
        return new Response(JSON.stringify({ 
          status: 'J.A.R.V.I.S. online',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          origin: origin
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
          }
        });
      }

      // AI Query endpoint
      if (path === '/api/query' && request.method === 'POST') {
        return await handleAIQuery(request, env, origin);
      }

      // Test endpoint for debugging
      if (path === '/test' && request.method === 'GET') {
        return new Response(JSON.stringify({ 
          message: 'Worker is working!',
          method: request.method,
          url: request.url,
          origin: origin,
          headers: Object.fromEntries(request.headers.entries())
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
          }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ 
        error: 'Endpoint not found',
        available_endpoints: ['/health', '/api/query', '/test'],
        received_path: path
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
        }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
        }
      });
    }
  }
};

// Handle AI queries with origin check
async function handleAIQuery(request, env, origin) {
  try {
    const { query } = await request.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
        }
      });
    }

    // Get token from environment
    const token = env.HUGGINGFACE_TOKEN;
    
    if (!token) {
      return new Response(JSON.stringify({ 
        error: 'API token not configured',
        debug: 'HUGGINGFACE_TOKEN environment variable not set'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
        }
      });
    }

    // Call Hugging Face API
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
      const errorText = await response.text();
      console.error('Hugging Face error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'AI service error',
        status: response.status,
        details: errorText
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
        }
      });
    }

    const data = await response.json();
    const aiResponse = data[0]?.generated_text || "I'm sorry, Sir. I couldn't process that request.";
    
    // Extract just the response part
    const responseText = aiResponse.includes("User query:") 
      ? aiResponse.split("User query:")[1].trim() 
      : aiResponse;

    return new Response(JSON.stringify({ 
      response: responseText,
      status: 'success',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      }
    });

  } catch (error) {
    console.error('AI Query error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process query',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      }
    });
  }
}
