# Database Features

## Resource Management

### Adding Resources
- Form-based submission with validation
- Image upload to Supabase storage
- Required fields:
  - Name
  - Creator
  - Tags (at least one)
  - Price
  - Operating System (at least one)
  - Link
- Optional fields:
  - Image (max 5MB, image files only)

### Editing Resources
- Pre-filled form with existing data
- Image replacement with automatic old image cleanup
- All fields editable
- Maintains original created_at timestamp

### Deleting Resources
- Confirmation prompt before deletion
- Cascading delete of associated image from storage
- Immediate UI update after deletion

## Data Validation

### Form Validation
```javascript
validateForm() {
  let isValid = true
  // Name validation
  if (!this.formData.name.trim()) {
    this.errors.name = 'Name is required'
    isValid = false
  }

  // Creator validation
  if (!this.formData.creator.trim()) {
    this.errors.creator = 'Creator is required'
    isValid = false
  }

  // Tags validation
  if (this.selectedTags.length === 0) {
    this.errors.tags = 'At least one tag is required'
    isValid = false
  }

  // Price validation
  if (!this.formData.price.trim()) {
    this.errors.price = 'Price is required'
    isValid = false
  }

  // OS validation
  if (this.selectedOS.length === 0) {
    this.errors.os = 'At least one operating system is required'
    isValid = false
  }

  // Link validation
  if (!this.formData.link.trim()) {
    this.errors.link = 'Link is required'
    isValid = false
  } else if (!this.formData.link.startsWith('http')) {
    this.errors.link = 'Please enter a valid URL starting with http:// or https://'
    isValid = false
  }

  return isValid
}
```

## Image Handling

### Upload Process
1. File selection with validation
2. Preview generation
3. Upload to Supabase storage on form submit
4. Public URL generation for display

### Image Validation
```javascript
if (!file.type.startsWith('image/')) {
  this.imageError = 'Please select an image file'
  return
}
if (file.size > 5 * 1024 * 1024) { // 5MB limit
  this.imageError = 'Image must be less than 5MB'
  return
}
```

### Storage Structure
- Bucket: 'resources'
- Path: 'resource-images/{random-id}.{ext}'
- Public access for display
- Automatic cleanup on resource deletion or update
