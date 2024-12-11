import fetch from 'node-fetch';
import { execSync } from 'child_process';

const SITE_ID = 'beatboxstudio';
const USER_EMAIL = 'general@madebyporter.com';

async function setAdminRole() {
  try {
    // Get access token
    const response = await fetch('https://bbx-web.netlify.app/.netlify/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    const { access_token } = await response.json()

    // Get users
    const usersResponse = await fetch('https://bbx-web.netlify.app/.netlify/identity/admin/users', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    const users = await usersResponse.json()
    const user = users.find(u => u.email === process.argv[2])

    if (user) {
      // Update user roles
      const updateResponse = await fetch(`https://bbx-web.netlify.app/.netlify/identity/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_metadata: {
            roles: ['admin']
          }
        })
      })

      if (updateResponse.ok) {
        process.exit(0)
      } else {
        process.exit(1)
      }
    } else {
      process.exit(1)
    }
  } catch (error) {
    process.exit(1)
  }
}

setAdminRole() 