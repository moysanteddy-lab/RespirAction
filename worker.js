// ============================================
// Cloudflare Worker - Proxy sécurisé pour Groq (Llama 3.3 70B) + Tavily Search
// ============================================
//
// DÉPLOIEMENT :
// 1. Va sur https://dash.cloudflare.com
// 2. Menu gauche → Workers & Pages → ton worker existant
// 3. Edit Code → colle ce code
// 4. Deploy
// 5. Va dans Settings → Variables → Add Variable :
//    - Nom : GROQ_API_KEY
//    - Valeur : ta clé API Groq (depuis https://console.groq.com/keys)
//    - Coche "Encrypt"
//    - Nom : TAVILY_API_KEY
//    - Valeur : ta clé Tavily (depuis https://tavily.com)
//    - Coche "Encrypt"
// 6. (Optionnel) Supprime l'ancienne variable GEMINI_API_KEY
//
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Recherche Tavily — retourne les top résultats formatés
async function tavilySearch(query, apiKey) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: query,
      max_results: 5,
      search_depth: 'basic',
      include_answer: false
    })
  });

  if (!res.ok) return null;

  const data = await res.json();
  const results = data.results;
  if (!results || results.length === 0) return null;

  return results.slice(0, 5).map((r, i) =>
    `${i + 1}. ${r.title} (${r.url})\n   ${r.content || ''}`
  ).join('\n');
}

// Appel Groq (Llama 3.3 70B) — pas de retry sur 429
async function callLLM(messages, apiKey) {
  return await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      max_tokens: 3500,
      temperature: 0.8
    })
  });
}

// Troncature intelligente : garde le system + les N derniers messages
function trimMessages(messages, maxNonSystem) {
  if (messages.length <= 1) return messages;
  const system = messages[0]?.role === 'system' ? [messages[0]] : [];
  const rest = system.length ? messages.slice(1) : messages;
  if (rest.length <= maxNonSystem) return messages;
  return [...system, ...rest.slice(-maxNonSystem)];
}

export default {
  async fetch(request, env) {
    // Gérer les requêtes OPTIONS (preflight CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Seulement POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();

      // Vérifier que le body contient des messages
      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(JSON.stringify({ error: 'Format invalide' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      // Limiter la taille des messages (sécurité — 500KB)
      if (JSON.stringify(body.messages).length > 500000) {
        return new Response(JSON.stringify({ error: 'Message trop long', code: 'PAYLOAD_TOO_LARGE' }), {
          status: 413,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      // Troncature de sécurité côté serveur (max 40 messages hors system)
      let messages = trimMessages([...body.messages], 40);

      // Phase 5 (Confrontation) : enrichir avec Tavily Search
      if (body.search && env.TAVILY_API_KEY) {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
          try {
            const searchResults = await tavilySearch(lastUserMsg.content, env.TAVILY_API_KEY);
            if (searchResults) {
              const sourceBlock = `\n\nSOURCES FACTUELLES DISPONIBLES (utilise ces données réelles pour confronter) :\n${searchResults}\n\nIMPORTANT : Cite TOUJOURS la source (nom du site + URL) quand tu utilises un fait. Si les sources ne sont pas pertinentes, ignore-les.`;
              if (messages[0] && messages[0].role === 'system') {
                messages[0] = { ...messages[0], content: messages[0].content + sourceBlock };
              }
            }
          } catch (e) {
            console.error('Tavily Search error:', e.message);
          }
        }
      }

      // Appeler Groq
      const llmResponse = await callLLM(messages, env.GROQ_API_KEY);

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        console.error('Groq error:', llmResponse.status, errorText);

        const errorCode = llmResponse.status === 429 ? 'RATE_LIMIT'
          : llmResponse.status === 400 ? 'BAD_REQUEST'
          : llmResponse.status === 401 ? 'API_KEY_INVALID'
          : 'LLM_ERROR';

        return new Response(JSON.stringify({
          error: 'Erreur API Groq',
          code: errorCode,
          status: llmResponse.status,
          details: errorText
        }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      const data = await llmResponse.json();
      const reply = data.choices?.[0]?.message?.content || "Je n'ai pas pu générer de réponse.";

      return new Response(JSON.stringify({ reply }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Erreur serveur: ' + err.message, code: 'SERVER_ERROR' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }
};
