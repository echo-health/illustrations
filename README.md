# LloydsDirect Illustrations

This repo generates assets for use in both the `@echo-health/illustrations-web` and `@echo-health/illustrations-react-native` NPM packages.

## Adding new illustrations

1. Prepare a PNG. You'll want your source file to be at least 4x larger than the intended display size on desktop.
2. Pop your illustration in `source-illustrations/`
3. Run `npm run build` to generate sized and sharpened images
4. Push to master to publish to NPM and store assets in Google Cloud

## Use in your apps

1. Add `npm install @echo-health/illustrations-web` to your app or update it to the latest version (use `npm view @echo-health/illustrations-web versions --json` to view available version)
1. Use illustrations in your app with `<Illustration src="name-of-illustration" />`
