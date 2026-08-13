import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/types",
    "@workspace/codegen",
    "@workspace/mockgen",
    "@workspace/data-access",
  ],
  images: {
    remotePatterns: [],
  },
}

export default withNextIntl(nextConfig)
