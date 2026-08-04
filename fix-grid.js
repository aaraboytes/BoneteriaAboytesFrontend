const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'aarab', 'Documents', 'Antigravity', 'ClinicSystem', 'frontend', 'material-kit-react', 'src', 'app', 'dashboard', 'page.tsx');

let content = fs.readFileSync(filePath, 'utf8');

// The original file used `<Grid item xs={12} sm={6} lg={4}>` which caused issues.
// Later we tried `<Grid lg={4} sm={6} xs={12}>` without `item` and it complained about missing `item`.
// Let's use `Grid` without `item` but cast to any, or just use the exact correct prop.
// Actually MUI v5 `Grid` DOES accept `item` but it must be a boolean or true.
// Wait, the error is specifically `Property 'item' does not exist on type 'IntrinsicAttributes...`.
// This means we might be importing the wrong Grid completely, or the project uses a custom override.
// Wait, looking at the very first version of `page.tsx` before I changed it, it was:
// `<Grid lg={3} sm={6} xs={12}>`
// WAIT, no! The very first version had:
// `<Grid size={{ lg: 3, sm: 6, xs: 12 }}>`
// No, the original file I viewed at the very start of the conversation had:
// `106:       <Grid`
// `107:         size={{`
// `108:           lg: 3,`
// `109:           sm: 6,`
// `110:           xs: 12,`
// `111:         }}`
// `112:       >`
// Therefore, the project IS using MUI v2 Grid, which uses the `size` prop instead of `item`, `xs`, `sm`, `lg` directly.
// How do we import Grid v2 in MUI v5? By `import Grid from '@mui/material/Unstable_Grid2';`.
// BUT `Unstable_Grid2` failed to resolve earlier.
// Wait, looking at my first `view_file` of `page.tsx` in step 2840, it just had:
// `4: import Grid from '@mui/material/Grid';`
// And it used the `size` prop directly: `<Grid size={{ lg: 3, sm: 6, xs: 12 }}>`!
// I must have imported `Grid` from `@mui/material/Grid` and it supports `size` because the project is running MUI v6 or a specific v5 setup where grid has been updated!

// Let's fix ALL grid tags to use `<Grid size={{ xs: 12, ... }}>` and `import Grid from '@mui/material/Grid';`.

content = content.replace(/import Grid from '@mui\/material\/Grid';/g, `import Grid from '@mui/material/Grid';`);

// Replace `<Grid item xs={12} sm={6} lg={4}>` and variations
content = content.replace(/<Grid[^\>]*?lg=\{4\}[^\>]*?>/g, '<Grid size={{ xs: 12, sm: 6, lg: 4 }}>');
content = content.replace(/<Grid[^\>]*?lg=\{6\}[^\>]*?>/g, '<Grid size={{ xs: 12, sm: 6, lg: 6 }}>');
content = content.replace(/<Grid[^\>]*?lg=\{12\}[^\>]*?>/g, '<Grid size={{ xs: 12, lg: 12 }}>');
content = content.replace(/<Grid[^\>]*?lg=\{8\}[^\>]*?>/g, '<Grid size={{ xs: 12, lg: 8 }}>');
content = content.replace(/<Grid[^\>]*?lg=\{3\}[^\>]*?>/g, '<Grid size={{ xs: 12, sm: 6, lg: 3 }}>');

// Restore grid containers
content = content.replace(/<Grid size=\{\{ xs: 12, sm: 6, lg: 4 \}\} container spacing=\{3\}>/g, '<Grid container spacing={3}>');
content = content.replace(/<Grid size=\{\{ xs: 12, sm: 6, lg: 6 \}\} container spacing=\{3\}>/g, '<Grid container spacing={3}>');
content = content.replace(/<Grid size=\{\{ xs: 12, lg: 12 \}\} container spacing=\{3\}>/g, '<Grid container spacing={3}>');
content = content.replace(/<Grid size=\{\{ xs: 12, lg: 8 \}\} container spacing=\{3\}>/g, '<Grid container spacing={3}>');
content = content.replace(/<Grid size=\{\{ xs: 12, sm: 6, lg: 3 \}\} container spacing=\{3\}>/g, '<Grid container spacing={3}>');

// Ensure correct spacing for the root grid container
content = content.replace(/<Grid container spacing=\{3\}>/g, '<Grid container spacing={3}>');

fs.writeFileSync(filePath, content);
console.log('Fixed grid props.');
