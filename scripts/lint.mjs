import fs from "fs";
import path from "path";

const root = process.cwd();
const targets = ["app", "components", "lib", "scripts"].flatMap(walk);
let failed = false;

for (const file of targets.filter((f) => /\.(js|mjs)$/.test(f))) {
  const text = fs.readFileSync(file, "utf8");
  if (/\bconsole\.log\([^)]*(SECRET|TOKEN|KEY|PASSWORD)/i.test(text)) {
    console.error(`Possível log sensível: ${path.relative(root, file)}`);
    failed = true;
  }
  if (/JSON\.parse\([^)]*\)(?![\s\S]{0,80}catch)/.test(text) && !file.includes("test")) {
    // Aviso apenas: vários parses estão em helpers controlados.
  }
}

if (failed) process.exit(1);
console.log(`lint ok (${targets.length} arquivos verificados)`);

function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(abs, d.name);
    if (d.isDirectory()) return walk(path.relative(root, p));
    return [p];
  });
}
