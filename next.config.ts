import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Ensure trailing slashes don't trigger extra redirects in middleware
  trailingSlash: false, 
  // Helps debugging headers if Supabase and intl are fighting
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default withNextIntl(nextConfig);


// import type { NextConfig } from "next";
// import createNextIntlPlugin from 'next-intl/plugin';

// const withNextIntl = createNextIntlPlugin();

// const nextConfig: NextConfig = {
//   reactCompiler: true,
// };

// export default withNextIntl(nextConfig);