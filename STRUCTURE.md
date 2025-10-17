# Project Structure

## Pages Directory
```
src/pages/
├── HomePage.tsx        # Main validation page logic
├── HomePage.css        # Page-specific styles
└── index.ts           # Page exports
```

## Components Directory
```
src/components/
├── common/
│   ├── Footer.tsx      # Footer component
│   ├── Footer.css      # Footer styles
│   └── index.ts        # Common component exports
├── FileUpload.tsx      # File upload component
├── FileUpload.css      # Upload styles
├── ValidationResults.tsx  # Results display
└── ValidationResults.css # Results styles
```

## App Structure
- **App.tsx**: Root component handling overall layout
- **HomePage.tsx**: Main page with validation logic
- **Footer.tsx**: Shared footer component

This structure follows React best practices by separating:
- Pages (route-level components)
- Common components (reusable UI elements)
- Page-specific logic and styles