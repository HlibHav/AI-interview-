# Beyond Presence Embed Options - Anonymous Access

## Current Implementation

We've implemented several approaches to enable anonymous/guest access to Beyond Presence agents without requiring user login:

### 1. Agent Creation Parameters
When creating an agent via the API, we now include:
- `is_public: true` - Marks the agent as publicly accessible
- `allow_anonymous: true` - Allows anonymous users to access
- `require_auth: false` - Disables authentication requirement

### 2. Embed URL Parameters
The embed URL now includes query parameters:
- `anonymous=true`
- `guest=true`
- `skipAuth=true`

Example: `https://app.bey.chat/embed/{agentId}?anonymous=true&guest=true&skipAuth=true`

### 3. API Response Fields
The code now:
- Uses `agent.embed_url` from the API response if available
- Falls back to `agent.url` if `embed_url` is not present
- Generates embed URL using standard pattern as last resort

## Testing

To verify which approach works:

1. **Check API Response**: Look at the console logs when creating an agent. The logs will show:
   - `hasEmbedUrl: true/false` - Whether the API provides an embed_url
   - `hasUrl: true/false` - Whether the API provides a url field
   - `allKeys: [...]` - All available fields in the API response

2. **Test Different URL Patterns**:
   - `https://app.bey.chat/embed/{agentId}?anonymous=true`
   - `https://bey.chat/{agentId}` (alternative domain)
   - Use the `embed_url` directly from API response if available

3. **Check Agent Configuration**:
   - Verify in Beyond Presence dashboard if agents can be set to "public" or "anonymous"
   - Check if there's a setting in the dashboard to disable authentication

## Alternative Approaches

If the above doesn't work, consider:

1. **Contact Beyond Presence Support**: Ask about:
   - Official embed parameters for anonymous access
   - Whether agents need to be configured in their dashboard for public access
   - If there's a different embed endpoint for anonymous users

2. **Use Conversation URL Instead**: The conversation URL might have different authentication requirements:
   - `https://app.bey.chat/conversation/{agentId}`

3. **Check Agent Settings**: The agent might need to be configured in the Beyond Presence dashboard to allow anonymous access before the embed will work without login.

## Next Steps

1. Test the current implementation and check console logs
2. Review what fields the API actually returns
3. If parameters don't work, contact Beyond Presence support for official documentation on anonymous embedding
4. Consider using the conversation URL as a fallback if embed requires authentication

