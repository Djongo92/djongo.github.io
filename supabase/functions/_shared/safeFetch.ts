// Shared safeFetch — resolves DNS and blocks private / loopback / link-local
// IPs to neutralize SSRF against cloud metadata and internal networks.

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
];
const PRIVATE_V4_172 = (ip: string) => {
  const m = ip.match(/^172\.(\d+)\./);
  if (!m) return false;
  const n = parseInt(m[1], 10);
  return n >= 16 && n <= 31;
};

const isPrivateIp = (ip: string) => {
  // IPv6: block ::1, fc00::/7, fe80::/10, and IPv4-mapped private addresses
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true; // ULA
    if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true; // link-local
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  if (PRIVATE_V4.some((r) => r.test(ip))) return true;
  if (PRIVATE_V4_172(ip)) return true;
  return false;
};

const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeFetchError";
  }
}

/**
 * fetch() wrapper that:
 * - Forces http/https schemes
 * - Resolves DNS and rejects private / loopback / link-local IPs
 * - Limits ports to standard web ports
 * - Refuses suspicious hostnames (localhost, *.internal, *.local, *.svc, etc.)
 */
export async function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SafeFetchError("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SafeFetchError("Only http(s) URLs are allowed");
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) throw new SafeFetchError("Missing hostname");

  const blockedHostnames = ["localhost", "ip6-localhost", "ip6-loopback", "broadcasthost"];
  if (blockedHostnames.includes(host)) throw new SafeFetchError("Blocked hostname");
  if (
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.endsWith(".localhost") ||
    host.endsWith(".svc") ||
    host.endsWith(".cluster.local")
  ) {
    throw new SafeFetchError("Blocked internal hostname");
  }

  // Port restriction
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  if (!ALLOWED_PORTS.has(port)) throw new SafeFetchError("Blocked port");

  // If the hostname is already a literal IP, validate directly. Otherwise
  // resolve via Deno's DNS resolver and validate every returned address.
  const literalIp = /^[\d.]+$/.test(host) || host.includes(":");
  const ips: string[] = [];
  if (literalIp) {
    ips.push(host);
  } else {
    try {
      // deno-lint-ignore no-explicit-any
      const a = await (Deno as any).resolveDns(host, "A").catch(() => [] as string[]);
      // deno-lint-ignore no-explicit-any
      const aaaa = await (Deno as any).resolveDns(host, "AAAA").catch(() => [] as string[]);
      ips.push(...a, ...aaaa);
    } catch {
      // If DNS resolution fails we let fetch fail naturally
    }
  }
  for (const ip of ips) {
    if (isPrivateIp(ip)) throw new SafeFetchError("Blocked private IP target");
  }

  return await fetch(parsed.toString(), init);
}

/** Normalize a user-supplied URL: add https:// if scheme missing, trim. */
export const normalizeUrl = (raw: string): string => {
  const u = (raw ?? "").trim();
  if (!u) return u;
  if (!/^https?:\/\//i.test(u)) return "https://" + u;
  return u;
};