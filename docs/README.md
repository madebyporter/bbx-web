# BBX Resource Database Documentation

## Overview
BBX Resource Database is a web application for managing and discovering music production resources. It provides a searchable and filterable interface for DAWs, VSTs, plugins, and other music software.

## Quick Start
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   SUPABASE_URL=your-project-url
   SUPABASE_KEY=your-anon-key
   ```
3. Install dependencies: `npm install`
4. Run development server: `npm run dev`

## Core Features
- Resource Management (Add, Edit, Delete)
- Real-time Search with word-start matching
- Advanced Filtering (Price, OS, Tags)
- Custom Sorting (Date, Name, Creator, Price)
- Image Upload with Supabase Storage
- Tag System with autocomplete

## Tech Stack
- Nuxt 3
- Vue 3 (Composition API & Options API)
- Supabase (Database & Storage)
- TailwindCSS
- GSAP (Animations)

## Documentation Sections
- [Architecture](./architecture/tech-stack.md)
  - Technology Stack
  - Project Structure
  - Database Schema
- [Features](./features/database.md)
  - Database Operations
  - Search System
  - Filtering & Sorting
  - Modal System
- [Components](./components/database.md)
  - Component Documentation
  - Props & Events
- [Styling](./assets/styles.md)
  - TailwindCSS Configuration
  - Custom Classes 