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

let imageMap = {};

function successLog(message) {
  console.log("✓", message);
}

function generateWebFiles(sourcePath, imageData, resolution) {
  const name = getIllustratioNameFromFilename(sourcePath);
  const contentHash = crypto.createHash("sha1").update(imageData).digest("hex");
  const outputFileName = `${name}.${contentHash}${resolution}.png`;

  imageMap = {
    ...imageMap,
    [name]: {
      ...imageMap[name],
      [resolution]: `https://storage.googleapis/echo-illustrations/${outputFileName}`
    }
  };

  fs.outputFileSync(
    path.join(OUTPUT_FOLDER_WEB_CDN, outputFileName),
    imageData
  );

  successLog(`generated "${outputFileName}" for web`);
}

function generateNativeFiles(sourcePath, imageData, res) {
  const name = getIllustratioNameFromFilename(sourcePath);
  const resolution = res == "@1x" ? "" : res;
  const outputFileName = `${name}${resolution}.png`;

  fs.outputFileSync(path.join(OUTPUT_FOLDER_RN, outputFileName), imageData);

  successLog(`generated "${outputFileName}" for react-native`);
}

function getIllustratioNameFromFilename(fileName) {
  return fileName.replace(/[ ]+/g, "-").trim().replace(".png", "");
}

const sizeMap = {
  "@4x": 1,
  "@3x": 0.75,
  "@2x": 0.5,
  "@1x": 0.25
};

let chain = Promise.resolve();

illustrations.forEach((ill) => {
  const sizes = Object.entries(sizeMap);

  const image = sharp(path.join(SOURCE_FOLDER, ill));

  for (const [key, value] of sizes) {
    // Create each file one at a time
    chain = chain
      .then(() => Promise.resolve())
      .then(() => image.metadata())
      .then((meta) => {
        return image.resize(Math.floor(meta.width * value)).toBuffer();
      })
      .then(async (imageData) => {
        await generateWebFiles(ill, imageData, key);
        await generateNativeFiles(ill, imageData, key);
      });
  }
});

chain.then(() => {
  fs.outputFileSync(
    path.join(OUTPUT_FOLDER_WEB, "index.js"),
    format(`module.exports = ${JSON.stringify(imageMap)}`, ".js")
  );

  fs.outputFileSync(
    path.join(OUTPUT_FOLDER_RN, "package.json"),
    format(JSON.stringify(makeReactNativePackageJson()), "json")
  );

  fs.outputFileSync(
    path.join(OUTPUT_FOLDER_WEB, "package.json"),
    format(JSON.stringify(makeWebPackageJson()), "json")
  );
});

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
    version: "1.0.0"
  };
}
