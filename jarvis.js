// JARVIS Backend - Fixed Version
export default {
  async fetch(request, env, ctx) {
    // Handle ALL CORS requests first
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check - simple and reliable
      if (path === '/health') {
        return new Response(JSON.stringify({ 
          status: 'J.A.R.V.I.S. online',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      // AI Query endpoint
      if (path === '/api/query' && request.method === 'POST') {
        return await handleAIQuery(request, env);
      }

      // Test endpoint for debugging
      if (path === '/test' && request.method === 'GET') {
        return new Response(JSON.stringify({ 
          message: 'Worker is working!',
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers.entries())
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};

// Handle AI queries
async function handleAIQuery(request, env) {
  try {
    const { query } = await request.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
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
        'Access-Control-Allow-Origin': '*',
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
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
