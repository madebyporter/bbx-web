# Project Structure Documentation

This document outlines the structure of the site, detailing the purpose of each directory and key files within the project.

## Root Directory
- **.env.example**: Example environment configuration file.
- **.gitignore**: Specifies files and directories that should be ignored by Git.
- **app.vue**: The main Vue component that serves as the entry point for the application.
- **nuxt.config.ts**: Configuration file for the Nuxt.js application.
- **package.json**: Lists project dependencies and scripts.
- **README.md**: Overview and instructions for the project.
- **tsconfig.json**: TypeScript configuration file.

## Components Directory
Contains reusable Vue components that make up the user interface.
- **Database.vue**: Component for database interactions.
- **FilterSort.vue**: Component for filtering and sorting data.
- **IconApple.vue**: Icon component for Apple.
- **IconLinux.vue**: Icon component for Linux.
- **IconWindows.vue**: Icon component for Windows.
- **SearchFilter.vue**: Component for search filtering.
- **SubmitResource.vue**: Component for submitting resources.

## Assets Directory
Contains static assets such as styles and images.
- **css/**: Directory for CSS files.
  - **tailwind.css**: Tailwind CSS framework file.

## Docs Directory
Contains documentation files for the project.
- **architecture/**: Directory for architectural documentation.
  - **structure.md**: Documentation of the project structure.
  - **tech-stack.md**: Documentation of the technology stack used.
- **components/**: Documentation for individual components.
- **features/**: Documentation for features of the application.

## Plugins Directory
Contains any additional plugins used in the Nuxt.js application.

## Public Directory
Contains publicly accessible files.
- **favicon.ico**: The favicon for the application.
- **img/**: Directory for images used in the application.

## Utils Directory
Contains utility functions or modules.
- **supabase.js**: Utility for interacting with Supabase.

This structure provides a clear organization of the project, making it easier to navigate and understand the various components and their roles within the application.
