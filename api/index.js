// Vercel function entry. The Express app is bundled at build time (npm run build:api) because the
// server sources use extensionless imports and a path alias, which Node ESM can't resolve directly.
import bundle from "../dist-api/app.cjs";

export default bundle.app;
