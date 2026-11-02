// Carga módulos reales sin ejecutar Next ni proveedores externos. Los doubles se
// declaran explícitamente por path absoluto o nombre de paquete en cada prueba.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
export const root = path.resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
export function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.isAbsolute(file) ? file : path.join(root, file);
    if (Object.hasOwn(mocks, file)) return mocks[file];
    if (cache.has(file)) return cache.get(file);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    cache.set(file, module.exports);
    const resolve = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === 'server-only') return {}; // Tests Node; Next comprueba este límite en su build.
      if (!name.startsWith('.')) return require(name);
      const target = path.resolve(path.dirname(file), name);
      if (Object.hasOwn(mocks, target)) return mocks[target];
      if (fs.existsSync(target + '.ts')) return load(target + '.ts');
      if (fs.existsSync(target + '.tsx')) return load(target + '.tsx');
      return require(target);
    };
    vm.runInNewContext(source, { exports: module.exports, module, require: resolve, process, Buffer, Request, Response, URL, console, setTimeout, clearTimeout, ...globals }, { filename: file });
    cache.set(file, module.exports);
    return module.exports;
  }
  return load;
}
export const plain = (value) => JSON.parse(JSON.stringify(value));
