
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('GEMINI_API_KEY NOT FOUND in .env');
    process.exit(1);
}

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        console.log('Fetching from URL:', url.replace(apiKey, 'REDACTED'));
        const response = await axios.get(url);
        const data = response.data;

        console.log('Full API Response:', JSON.stringify(data, null, 2));

        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m) => {
                console.log(`- ${m.name} (${m.displayName})`);
            });
        } else {
            console.log('No models key found in response');
        }
    } catch (error) {
        if (error.response) {
            console.error('Error listing models:', error.response.status, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error listing models:', error.message);
        }
    }
}

listModels();
