# Configuration Files

This directory contains reference copies of configuration files used in the project. The actual working configuration files remain in the root directory as required by their respective tools.

## Files

### Build & Framework Configuration

These files **must remain at the root** but are documented here:

- **next.config.mjs** - Next.js configuration (root: `/next.config.mjs`)
  - Security headers and CORS settings
  - Image optimization
  - Build output configuration
  - Turbopack settings

- **tsconfig.json** - TypeScript configuration (root: `/tsconfig.json`)
  - Compiler options
  - Path aliases (@/\*, etc.)
  - Include/exclude patterns

- **postcss.config.mjs** - PostCSS configuration (root: `/postcss.config.mjs`)
  - Tailwind CSS integration
  - CSS processing pipeline

### UI & Component Configuration

- **components.json** (root: `/components.json`)
  - shadcn/ui configuration
  - Component generation defaults
  - UI framework settings
  - Path aliases for components

### Database Configuration

- **drizzle.config.ts** (root: `/drizzle.config.ts`)
  - ORM configuration
  - Schema location
  - Database dialect and credentials
  - Migration settings

## Configuration Hierarchy

1. **Environment Variables** (.env)
   - Runtime configuration
   - Secrets and API keys
   - Database connection strings

2. **Build Configuration** (tsconfig.json, next.config.mjs)
   - Framework setup
   - TypeScript compilation
   - Build optimization

3. **Code Generation** (components.json, drizzle.config.ts)
   - Code generation templates
   - Component defaults
   - Schema generation

## Reference Copies

This folder contains reference copies of key configuration files for documentation and version control purposes. These are mirrors of the root-level configuration files.

To update configuration:

1. **Edit the root-level file** (required for tools to find them)
2. **Optional**: Update the reference copy here for clarity

## Common Configuration Changes

### Adding a New Path Alias

Edit `tsconfig.json` and `components.json`:

```json
{
  "paths": {
    "@/newAlias": ["./path/to/code"]
  }
}
```

### Adjusting Build Settings

Edit `next.config.mjs`:

```javascript
const nextConfig = {
  // Your settings
};
```

### Adding Database Migrations

Edit `drizzle.config.ts`:

```typescript
export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  // ... other settings
});
```

### Customizing UI Components

Edit `components.json`:

```json
{
  "style": "new-york",
  "rsc": true
  // ... other settings
}
```

## References

- [Next.js Configuration](https://nextjs.org/docs/app/api-reference/next-config-js)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
