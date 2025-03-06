import { builder } from '@netlify/functions'

const serverHandler = async (event, context) => {
  // Get path from event
  const path = event.path.replace('/.netlify/functions/server', '')
  
  try {
    // Return the response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `<!DOCTYPE html>
<html>
  <head>
    <title>Beatbox</title>
  </head>
  <body>
    <div id="__nuxt"></div>
    <script type="module" src="/_nuxt/entry.js"></script>
  </body>
</html>`
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to render page' })
    }
  }
}

export const handler = builder(serverHandler) 