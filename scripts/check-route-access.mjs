import fs from "node:fs";

const guardSource = fs.readFileSync("src/routes/_authenticated/route.tsx", "utf8");
const layoutSource = fs.readFileSync("src/components/AppLayout.tsx", "utf8");

const adminBlock = guardSource.match(/const ADMIN_ONLY_PATHS = new Set\(\[([\s\S]*?)\]\);/);
if (!adminBlock) throw new Error("Não foi possível localizar ADMIN_ONLY_PATHS no guard autenticado");

const operatorBlock = layoutSource.match(/const operadorMenu: MenuItem\[\] = \[([\s\S]*?)\];/);
if (!operatorBlock) throw new Error("Não foi possível localizar operadorMenu no AppLayout");

const adminOnly = new Set(
  [...adminBlock[1].matchAll(/"(\/[^"\s]+)"/g)].map((match) => match[1]),
);
const operatorPaths = [...operatorBlock[1].matchAll(/path:\s*"(\/[^"\s]+)"/g)].map((match) => match[1]);

if (operatorPaths.length === 0) throw new Error("Menu do Operador ficou vazio ou não pôde ser analisado");

const duplicates = operatorPaths.filter((path, index) => operatorPaths.indexOf(path) !== index);
if (duplicates.length) {
  throw new Error(`Menu do Operador contém rota duplicada: ${[...new Set(duplicates)].join(", ")}`);
}

const collisions = operatorPaths.filter((path) => adminOnly.has(path));
if (collisions.length) {
  throw new Error(`Rota(s) do Operador também estão marcadas como Admin-only: ${collisions.join(", ")}`);
}

const requiredSelfServicePaths = [
  "/painel",
  "/pendencias",
  "/progresso",
  "/certificados",
  "/treinamentos",
  "/conteudos",
  "/teste-rapido",
  "/simulador",
  "/stress-test",
  "/desafio-diario",
  "/meu-perfil",
  "/pratico",
  "/minhas-ocorrencias",
];

const missing = requiredSelfServicePaths.filter((path) => !operatorPaths.includes(path));
if (missing.length) {
  throw new Error(`Fluxo(s) de autosserviço ausente(s) do menu do Operador: ${missing.join(", ")}`);
}

console.log(
  `Contrato de rotas do Operador validado: ${operatorPaths.length} rota(s), sem conflito com ${adminOnly.size} rota(s) Admin-only.`,
);