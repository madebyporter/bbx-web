declare module 'netlify-identity-widget' {
  interface User {
    id: string;
    email: string;
    user_metadata: {
      avatar_url?: string;
      full_name?: string;
    };
    app_metadata: {
      roles?: string[];
    };
  }

  interface Widget {
    init(opts?: { APIUrl?: string; logo?: boolean }): void;
    open(): void;
    close(): void;
    logout(): void;
    currentUser(): User | null;
    on(event: 'init' | 'login' | 'logout' | 'error' | 'open' | 'close', cb: (user?: User) => void): void;
  }

  const widget: Widget;
  export default widget;
} 