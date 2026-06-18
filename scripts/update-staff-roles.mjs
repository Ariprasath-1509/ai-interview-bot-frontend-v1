import fs from "fs";
import path from "path";

const root = path.resolve("src");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

let count = 0;
for (const f of walk(root)) {
  let c = fs.readFileSync(f, "utf8");
  const orig = c;
  c = c.replace(/!\['ADMIN', 'SUPER_ADMIN', 'RECRUITER'\]\.includes\(session\.role\)/g, "!isStaffReadRole(session.role)");
  c = c.replace(/!\['ADMIN', 'SUPER_ADMIN'\]\.includes\(session\.role\)/g, "!isStaffAdminRole(session.role)");
  c = c.replace(/session\.role !== "ADMIN" && session\.role !== "SUPER_ADMIN" && session\.role !== "RECRUITER"/g, "!isStaffReadRole(session.role)");
  c = c.replace(/session\.role !== "ADMIN" && session\.role !== "SUPER_ADMIN"/g, "!isStaffAdminRole(session.role)");
  c = c.replace(/session\?\.role === "ADMIN" \|\| session\?\.role === "SUPER_ADMIN" \|\| session\?\.role === "RECRUITER"/g, "isStaffReadRole(session?.role)");
  c = c.replace(/session\?\.role === "ADMIN" \|\| session\?\.role === "SUPER_ADMIN"/g, "isStaffAdminRole(session?.role)");
  c = c.replace(/session\.role === "ADMIN" \|\| session\.role === "SUPER_ADMIN" \|\| session\.role === "RECRUITER"/g, "isStaffReadRole(session.role)");
  c = c.replace(/session\.role === "ADMIN" \|\| session\.role === "SUPER_ADMIN"/g, "isStaffAdminRole(session.role)");
  c = c.replace(/role === "SUPER_ADMIN" \|\| role === "ADMIN" \|\| role === "RECRUITER"/g, "isStaffReadRole(role)");
  if (c !== orig) {
    const needImport =
      (c.includes("isStaffReadRole") || c.includes("isStaffAdminRole")) &&
      !c.includes("from '@/lib/staffRoles'");
    if (needImport) {
      const imports = [];
      if (c.includes("isStaffReadRole")) imports.push("isStaffReadRole");
      if (c.includes("isStaffAdminRole")) imports.push("isStaffAdminRole");
      const line = `import { ${imports.join(", ")} } from '@/lib/staffRoles';\n`;
      if (c.startsWith('"use client"') || c.startsWith("'use client'")) {
        c = c.replace(/^((?:'use client'|"use client");?\s*\n)/, `$1${line}`);
      } else {
        c = line + c;
      }
    }
    fs.writeFileSync(f, c);
    count++;
    console.log("updated", f);
  }
}
console.log("total", count);
