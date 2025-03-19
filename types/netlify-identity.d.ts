export interface NetlifyIdentityUser {
  id: string;
  email: string;
  token?: {
    access_token?: string;
  };
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
    [key: string]: any;
  };
  app_metadata: {
    roles?: string[];
    [key: string]: any;
  };
  created_at?: string;
}

declare global {
  interface Window {
    netlifyIdentity: {
      currentUser: () => NetlifyIdentityUser | null;
    };
  }
}

export {}; 