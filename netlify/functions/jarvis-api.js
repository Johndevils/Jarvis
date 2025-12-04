const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { input } = JSON.parse(event.body);
    const HF_TOKEN = process.env.HF_TOKEN;
    const HF_API_URL = "https://api-inference.huggingface.co/models/deepseek-ai/deepseek-coder-6.7b-instruct";
    
    try {
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`
            },
            body: JSON.stringify({
                inputs: `You are Jarvis, a helpful AI assistant. Answer briefly, concisely, and address the user as 'Sir'.\n\nUser: ${input}\nJarvis:`,
                parameters: {
                    max_new_tokens: 150,
                    temperature: 0.7,
                    do_sample: true,
                    return_full_text: false
                }
            })
        });
        
        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
