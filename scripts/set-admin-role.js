import fetch from 'node-fetch';
import { execSync } from 'child_process';

const SITE_ID = 'beatboxstudio';
const USER_EMAIL = 'general@madebyporter.com';

async function setAdminRole() {
  try {
    // Get the access token from Netlify CLI
    const tokenOutput = execSync('netlify api authInfo', { encoding: 'utf8' });
    const { access_token } = JSON.parse(tokenOutput);

    if (!access_token) {
      console.error('Could not get access token');
      return;
    }

    console.log('Got access token, fetching users...');

    // Get user
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/identity/users`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch users:', await response.text());
      return;
    }

    const users = await response.json();
    const user = users.find(u => u.email === USER_EMAIL);

    if (!user) {
      console.error('User not found');
      return;
    }

    console.log('Found user, updating roles...');

    // Update user roles
    const updateResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/identity/users/${user.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_metadata: {
            roles: ['admin']
          }
        })
      }
    );

    if (updateResponse.ok) {
      console.log('Successfully set admin role');
    } else {
      console.error('Failed to set admin role:', await updateResponse.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout.toString());
    if (error.stderr) console.error('stderr:', error.stderr.toString());
  }
}

setAdminRole(); 