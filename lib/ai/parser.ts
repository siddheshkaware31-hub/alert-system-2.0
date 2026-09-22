export async function analyzeHotelReply(messageText: string): Promise<'confirmed' | 'failed' | 'unknown'> {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    // Fallback regex logic if no API key is provided
    const lower = messageText.toLowerCase()
    if (lower.includes('not ') || lower.includes('cannot') || lower.includes('sorry') || lower.includes('unable')) {
      return 'unknown'
    }
    const CONFIRMATION_KEYWORDS = /\b(yes|confirm(?:ed)?|ok|sure|booked?|done|approved?|agree|accept)\b/i
    if (CONFIRMATION_KEYWORDS.test(messageText)) return 'confirmed'
    return 'unknown'
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ 
            text: "You are an automated corporate travel assistant. Your job is to read replies from hotels regarding a booking request. Output EXACTLY ONE WORD from this list: 'confirmed' (if the hotel explicitly confirmed the booking), 'failed' (if they are fully booked, rejected the booking, or cancelled it), or 'unknown' (if it's an auto-reply, asking for more info, or ambiguous). Do not output any other text or punctuation." 
          }]
        },
        contents: [{ parts: [{ text: messageText }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      })
    })

    const data = await response.json()
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase().replace(/[^a-z]/g, '')

    if (result === 'confirmed' || result === 'failed') return result
    return 'unknown'
  } catch (err) {
    console.error('AI Parsing Error:', err)
    return 'unknown'
  }
}
