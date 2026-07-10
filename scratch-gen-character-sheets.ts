import "dotenv/config";
import fs from "fs";
import path from "path";
import { openaiProvider } from "./server/providers/OpenAIProvider.js";

const charsDir = path.join(process.cwd(), "server", "stories", "t1-alices-adventures-in-wonderland", "charators");

async function main() {
  const files = fs.readdirSync(charsDir);
  const mdFiles = files.filter((f) => f.toLowerCase().endsWith(".md"));

  for (const mdFile of mdFiles) {
    const key = path.basename(mdFile, ".md");
    const hasImage = files.some(
      (f) => /\.(png|jpe?g)$/i.test(f) && path.basename(f, path.extname(f)).toLowerCase() === key.toLowerCase()
    );
    if (hasImage) {
      console.log(`[skip] ${key} already has an image`);
      continue;
    }

    const prompt = fs.readFileSync(path.join(charsDir, mdFile), "utf-8").trim();
    console.log(`[generating] ${key} ...`);

    const dataUri = await openaiProvider.generateCharacterSheet(prompt);
    const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUri);
    if (!match) {
      console.error(`[error] ${key}: could not parse generated image data`);
      continue;
    }
    const [, subtype, base64Data] = match;
    const ext = subtype === "svg+xml" ? "svg" : subtype === "jpeg" ? "jpg" : subtype;
    const outPath = path.join(charsDir, `${key}.${ext}`);
    fs.writeFileSync(outPath, Buffer.from(base64Data, "base64"));
    console.log(`[saved] ${outPath}${ext === "svg" ? " (procedural fallback, not a real AI render)" : ""}`);
  }
}

main().then(() => {
  console.log("Done.");
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
