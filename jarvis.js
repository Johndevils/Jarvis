// JARVIS Backend - Fixed Origin Detection
export default {
  async fetch(request, env, ctx) {
    // Define allowed origins
    const ALLOWED_ORIGINS = [
      'https://jarvis-997.pages.dev',
      'https://jarvis-997.pages.dev/',
      'null', // Allow direct browser access for testing
    ];

    // Get origin from request
    const origin = request.headers.get('Origin');
    const userAgent = request.headers.get('User-Agent');
    
    // Check if origin is allowed
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || 
                           (!origin && userAgent?.includes('Mozilla')) || // Allow direct browser access
                           (!origin && userAgent?.includes('curl')); // Allow curl access
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      if (isAllowedOrigin) {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': origin || '*',
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
        message: 'This API can only be accessed from https://jarvis-997.pages.dev/ or directly for testing',
        debug: {
          origin: origin || 'none',
          user_agent: userAgent || 'none'
        }
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    try {
      // Root endpoint
      if (path === '/') {
        return new Response(JSON.stringify({ 
          message: 'J.A.R.V.I.S. Backend is running!',
          version: '3.0.0',
          endpoints: ['/health', '/api/query', '/test', '/debug'],
          timestamp: new Date().toISOString(),
          access_type: origin ? 'cors' : 'direct'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*',
          }
        });
      }

      // Health check endpoint
      if (path === '/health') {
        return new Response(JSON.stringify({ 
          status: 'J.A.R.V.I.S. online',
          timestamp: new Date().toISOString(),
          version: '3.0.0',
          origin: origin || 'direct_access',
          access_type: origin ? 'cors' : 'direct',
          user_agent: userAgent || 'none'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*',
          }
        });
      }

      // Debug endpoint
      if (path === '/debug') {
        return new Response(JSON.stringify({ 
          message: 'Debug information',
          method: request.method,
          url: request.url,
          path: path,
          origin: origin || 'direct_access',
          access_type: origin ? 'cors' : 'direct',
          user_agent: userAgent || 'none',
          headers: Object.fromEntries(request.headers.entries()),
          query_params: Object.fromEntries(url.searchParams.entries())
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*',
          }
        });
      }

      // Test endpoint
      if (path === '/test') {
        return new Response(JSON.stringify({ 
          message: 'Test endpoint working!',
          method: request.method,
          url: request.url,
          origin: origin || 'direct_access',
          access_type: origin ? 'cors' : 'direct',
          timestamp: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*',
          }
        });
      }

      // AI Query endpoint - ONLY POST requests
      if (path === '/api/query') {
        if (request.method === 'POST') {
          return await handleAIQuery(request, env, origin);
        } else {
          return new Response(JSON.stringify({ 
            error: 'Method not allowed',
            message: '/api/query only accepts POST requests',
            received_method: request.method,
            required_method: 'POST',
            usage: {
              endpoint: '/api/query',
              method: 'POST',
              body: {
                query: "Your question here"
              }
            }
          }), {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': origin || '*',
            }
          });
        }
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ 
        error: 'Endpoint not found',
        message: `The path ${path} is not available`,
        available_endpoints: ['/', '/health', '/api/query', '/test', '/debug'],
        received_path: path,
        received_method: request.method
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
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
          'Access-Control-Allow-Origin': origin || '*',
        }
      });
    }
  }
};

// Handle AI queries using OpenAI-compatible API
async function handleAIQuery(request, env, origin) {
  try {
    const { query } = await request.json();

    if (!query) {
      return new Response(JSON.stringify({ 
        error: 'Query is required',
        message: 'Please provide a query in request body',
        example: {
          query: "What is the weather like?"
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
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
          'Access-Control-Allow-Origin': origin || '*',
        }
      });
    }

    // Call Hugging Face using OpenAI-compatible API
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          {
            "role": "system",
            "content": "You are Jarvis. Be brief, precise, and witty. Address me as Sir."
          },
          {
            "role": "user",
            "content": query
          }
        ],
        max_tokens: 100,
        temperature: 0.7
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
          'Access-Control-Allow-Origin': origin || '*',
        }
      });
    }

    const data = await response.json();
    
    // Extract response from OpenAI-compatible format
    let aiResponse = "";
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      aiResponse = data.choices[0].message.content;
    } else {
      aiResponse = "I'm sorry, Sir. I couldn't process that request.";
      console.warn('Unexpected response format:', data);
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      status: 'success',
      timestamp: new Date().toISOString(),
      model: 'deepseek-ai/DeepSeek-V3',
      access_type: origin ? 'cors' : 'direct'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
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
        'Access-Control-Allow-Origin': origin || '*',
      }
    });
  }
}
