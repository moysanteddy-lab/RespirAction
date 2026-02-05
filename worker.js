// ============================================
// Cloudflare Worker - Proxy sécurisé pour Gemini + Tavily Search
// ============================================
//
// DÉPLOIEMENT :
// 1. Va sur https://dash.cloudflare.com
// 2. Menu gauche → Workers & Pages → Create
// 3. Clique "Create Worker"
// 4. Colle ce code dans l'éditeur
// 5. Deploy
// 6. Va dans Settings → Variables → Add Variable :
//    - Nom : GEMINI_API_KEY
//    - Valeur : ta clé API Gemini (depuis https://aistudio.google.com/apikey)
//    - Coche "Encrypt"
//    - Nom : TAVILY_API_KEY
//    - Valeur : ta clé Tavily (depuis https://tavily.com)
//    - Coche "Encrypt"
// 7. Note l'URL du worker (ex: https://mon-coach.moncompte.workers.dev)
// 8. Colle cette URL dans ton app (voir WORKER_URL dans app.js)
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

// Appel Gemini — pas de retry sur 429 (le client gère l'affichage d'erreur)
async function callGemini(messages, apiKey) {
  return await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash-lite',
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
        // Extraire le dernier message utilisateur comme requête de recherche
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
          try {
            const searchResults = await tavilySearch(lastUserMsg.content, env.TAVILY_API_KEY);
            if (searchResults) {
              // Injecter les sources dans le system prompt
              const sourceBlock = `\n\nSOURCES FACTUELLES DISPONIBLES (utilise ces données réelles pour confronter) :\n${searchResults}\n\nIMPORTANT : Cite TOUJOURS la source (nom du site + URL) quand tu utilises un fait. Si les sources ne sont pas pertinentes, ignore-les.`;
              if (messages[0] && messages[0].role === 'system') {
                messages[0] = { ...messages[0], content: messages[0].content + sourceBlock };
              }
            }
          } catch (e) {
            // Tavily a échoué — on continue sans sources
            console.error('Tavily Search error:', e.message);
          }
        }
      }

      // Appeler Gemini avec retry automatique sur rate limit
      const geminiResponse = await callGemini(messages, env.GEMINI_API_KEY);

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini error:', geminiResponse.status, errorText);

        // Renvoyer un code d'erreur exploitable par le frontend
        const errorCode = geminiResponse.status === 429 ? 'RATE_LIMIT'
          : geminiResponse.status === 400 ? 'BAD_REQUEST'
          : geminiResponse.status === 403 ? 'API_KEY_INVALID'
          : 'GEMINI_ERROR';

        return new Response(JSON.stringify({
          error: 'Erreur API Gemini',
          code: errorCode,
          status: geminiResponse.status,
          details: errorText
        }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      const data = await geminiResponse.json();
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
