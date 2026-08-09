// Module barrel. Only the route objects are re-exported here: controllers
// stay module-private so names like `getProfile` (auth + profile both export
// one) can never collide through the barrel. Import controllers directly from
// their module when needed.
import { authRoutes } from "./auth/auth.routes.js";
import { profileRoutes } from "./profile/profile.routes.js";
import { riasecRoutes } from "./riasec/riasec.routes.js";
import { recommendRoutes } from "./recommend/recommend.routes.js";
import { jambRoutes } from "./jamb/jamb.routes.js";
import { bfiRoutes } from "./bfi/bfi.routes.js";
import { adminRoutes } from "./admin/admin.routes.js";

export {
  authRoutes,
  profileRoutes,
  riasecRoutes,
  recommendRoutes,
  jambRoutes,
  bfiRoutes,
  adminRoutes,
};
