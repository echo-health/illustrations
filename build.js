// imports
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const prettier = require("prettier");
const prettierConfig = require("./.prettierrc");

// Path to png illustrations
const SOURCE_FOLDER = "./source-illustrations";

// Output folders per platform
const OUTPUT_FOLDER = "./dist";
const OUTPUT_FOLDER_WEB = path.join(OUTPUT_FOLDER, "/web");
const OUTPUT_FOLDER_WEB_CDN = path.join(OUTPUT_FOLDER, "/web-cdn");
const OUTPUT_FOLDER_RN = path.join(OUTPUT_FOLDER, "/rn");

fs.removeSync(OUTPUT_FOLDER);

function getIllustrations(folderPath) {
  return fs
    .readdirSync(folderPath)
    .filter((filename) => filename.endsWith(".png"));
}

const illustrations = getIllustrations(SOURCE_FOLDER);

const resolutionMap = {
  "@4x": 1,
  "@3x": 0.75,
  "@2x": 0.5,
  "@1x": 0.25
};

// Remove folders after each build
fs.removeSync(OUTPUT_FOLDER_WEB);
fs.removeSync(OUTPUT_FOLDER_WEB_CDN);
fs.removeSync(OUTPUT_FOLDER_RN);

function format(code, format) {
  return prettier.format(code, {
    ...prettierConfig,
    filepath: `filename.${format}`
  });
}

function successLog(message) {
  console.log("✓", message);
}

function getIllustratioNameFromFilename(fileName) {
  return fileName.replace(/[ ]+/g, "-").trim().replace(".png", "");
}

function makeWebPackageJson() {
  return {
    name: "@echo-health/illustrations-web",
    version: "1.0.0",
    main: "index.js"
  };
}

function makeReactNativePackageJson() {
  return {
    name: "@echo-health/illustrations-react-native",
    version: "1.0.0",
    main: "index.js"
  };
}

async function processWebFileForResolution(name, buffer, resolution) {
  const contentHash = crypto.createHash("sha1").update(buffer).digest("hex");
  const outputFileName = `${name}.${contentHash}${resolution}.png`;
  await fs.outputFile(path.join(OUTPUT_FOLDER_WEB_CDN, outputFileName), buffer);
  successLog(`generated "${outputFileName}" for web`);
  return `https://storage.googleapis.com/echo-illustrations/${outputFileName}`;
}

async function processNativeFileForResolution(name, buffer, resolution) {
  const outputFileName = `${name}${resolution}.png`;
  fs.outputFileSync(path.join(OUTPUT_FOLDER_RN, outputFileName), buffer);
  successLog(`generated "${outputFileName}" for react-native`);
}

async function processIllustration(illustration) {
  const resolutions = Object.entries(resolutionMap);
  const name = getIllustratioNameFromFilename(illustration);
  const image = sharp(path.join(SOURCE_FOLDER, illustration));
  const meta = await image.metadata();
  const width = Math.floor(meta.width * resolutionMap["@1x"]);
  const height = Math.floor(meta.height * resolutionMap["@1x"]);
  const processedImageData = {
    name,
    width,
    height
  };

  for (const [res, resMult] of resolutions) {
    const buffer = await image
      .resize(Math.floor(meta.width * resMult))
      .toBuffer();

    // Process the web file
    const hostedWebUrl = await processWebFileForResolution(name, buffer, res);
    processedImageData[res] = hostedWebUrl;

    // Process the native file
    await processNativeFileForResolution(name, buffer, res);
  }

  return processedImageData;
}

async function build() {
  const operations = illustrations.map(processIllustration);
  const processedIllustrations = await Promise.all(operations);

  const imageMap = processedIllustrations.reduce((data, image) => {
    data[image.name] = image;
    return data;
  }, {});

  fs.outputFileSync(
    path.join(OUTPUT_FOLDER_WEB, "index.js"),
    format(`module.exports = ${JSON.stringify(imageMap)}`, ".js")
  );

  fs.outputFileSync(
    path.join(OUTPUT_FOLDER_WEB, "index.d.ts"),
    format(`export default ${JSON.stringify(imageMap)}`, ".js")
  );

  fs.outputFileSync(
    path.join(OUTPUT_FOLDER_RN, "package.json"),
    format(JSON.stringify(makeReactNativePackageJson()), "json")
  );

  fs.outputFileSync(
    path.join(OUTPUT_FOLDER_WEB, "package.json"),
    format(JSON.stringify(makeWebPackageJson()), "json")
  );
}

build();
