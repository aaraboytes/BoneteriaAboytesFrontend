/** @type {import('next').NextConfig} */
const config = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Type errors fail the build (the project type-checks cleanly).
    typescript: {
        ignoreBuildErrors: false,
    },
    output: 'standalone',
};

export default config;
