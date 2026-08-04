/** @type {import('next').NextConfig} */
const config = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    output: 'standalone',
};

export default config;
