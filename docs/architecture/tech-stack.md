# Technology Stack

## Core Technologies

### Nuxt 3 & Vue 3
- **Framework Choice**: Using Nuxt 3 for server-side rendering and improved SEO
- **Component Structure**: Utilizing Vue 3's Composition API and Options API where appropriate
- **State Management**: Local component state with potential for Pinia integration

### Supabase
- **Database**: PostgreSQL database for storing resource information
- **Storage**: File storage for resource images
- **Authentication**: (Prepared for future implementation)
- **Real-time**: (Prepared for future implementation)

### UI & Styling
- **TailwindCSS**: Utility-first CSS framework for styling
- **GSAP**: Animation library for modal transitions
- **Custom Components**: Modular component design for reusability

## Project Structure
```
├── components/           # Vue components
│   ├── Database.vue     # Main resource listing and management
│   ├── FilterSort.vue   # Filtering and sorting modal
│   ├── SearchFilter.vue # Search and action buttons
│   ├── SubmitResource.vue # Resource submission/edit form
│   ├── IconApple.vue    # OS-specific icons
│   ├── IconWindows.vue
│   └── IconLinux.vue
├── utils/
│   └── supabase.js      # Supabase client configuration
├── assets/
│   └── css/
│       └── tailwind.css # Global styles and custom utilities
└── public/
    └── img/
        └── db/          # UI icons and assets
```

## Database Schema

### Resources Table
```sql
CREATE TABLE resources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  creator TEXT NOT NULL,
  tags TEXT[] NOT NULL,
  price TEXT NOT NULL,
  os TEXT[] NOT NULL,
  link TEXT NOT NULL,
  image_url TEXT,
  type TEXT NOT NULL DEFAULT 'software',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Component Communication Flow
```
app.vue
  ├── SearchFilter.vue
  │   └── Emits: open-modal, open-filter-modal, search
  ├── Database.vue
  │   └── Emits: edit-resource
  ├── FilterSort.vue
  │   └── Emits: close, apply-filters-and-sort
  └── SubmitResource.vue
      └── Emits: close, resource-added, resource-updated
```

## File Purposes
- **app.vue**: Main application layout and component orchestration
- **Database.vue**: Resource listing, sorting, filtering implementation
- **FilterSort.vue**: Modal for sorting and filtering controls
- **SearchFilter.vue**: Search input and action buttons
- **SubmitResource.vue**: Form for adding/editing resources
- **Icon*.vue**: SVG icon components for operating systems

```
├── components/           