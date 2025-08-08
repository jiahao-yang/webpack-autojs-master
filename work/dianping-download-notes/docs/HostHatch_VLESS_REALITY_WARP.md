## HostHatch (JP) — VLESS + REALITY + WARP Split‑Egress, with Clash Verge Rev

KISS guide to deploy a low‑risk proxy for coding/AI tools. English with brief Chinese hints.

### 0) What we build（要点）
- Server: sing‑box running VLESS + REALITY (no domain, TLS1.3 mimic 伪装) on port `443`
- Split‑egress（按域名分流）: Only AI domains exit via Cloudflare WARP (WireGuard), others go direct
- Client: Windows Clash Verge Rev (mihomo/Clash.Meta) using VLESS+REALITY

Why REALITY over WebSocket? REALITY is simpler (no域名/无CDN), smaller fingerprint（指纹）, excellent stealth for single‑server. WebSocket is useful mainly when you need CDN fronting (需要CDN/域名) or restricted ports; otherwise adds overhead/复杂度。

What is xhttp? A newer HTTP/1.1‑like transport in sing‑box/XTLS生态，设计成更“像真HTTP”的流量。优点是拟真度高；缺点是客户端支持尚不普及（Clash/Mihomo/Clash Verge Rev 目前普遍不支持）。因此本方案不使用 xhttp；如未来你的客户端改用 sing‑box 原生或支持 xhttp，再考虑迁移。

---

### 1) Server prerequisites（前提）
- Ubuntu 22.04/24.04 on HostHatch JP
- IPv4 enabled; open inbound TCP 443 in provider panel/ufw

```bash
sudo apt update && sudo apt install -y curl unzip jq socat
sudo timedatectl set-timezone Asia/Shanghai
# Optional: enable BBR（拥塞控制）
echo "net.core.default_qdisc=fq" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2) Install sing‑box（支持 VLESS+REALITY 与策略路由）
```bash
bash <(curl -fsSL https://sing-box.app/install.sh)
mkdir -p /usr/local/etc/sing-box
```

Generate credentials（生成密钥与UUID）
```bash
sing-box generate reality-keypair | tee /root/reality.json   # keep private_key safe
uuidgen | tee /root/vless_uuid.txt
```
Pick a TLS handshake SNI（伪装站点）: e.g. `www.cloudflare.com` 或 `www.wikipedia.org`。

### 3) Register WARP with wgcf（获取WARP参数）
```bash
curl -L https://github.com/ViRb3/wgcf/releases/latest/download/wgcf_$(uname -s)_amd64 -o wgcf
chmod +x wgcf && sudo mv wgcf /usr/local/bin/
wgcf register --accept-tos
wgcf generate
```
Note fields from `/root/wgcf-profile.conf`:
- PrivateKey
- Address (IPv4/IPv6)
- Peer PublicKey
- Endpoint (IP:Port)
- Reserved = a,b,c（三字节）

### 4) sing‑box config（含分流到WARP）
Create `/usr/local/etc/sing-box/config.json` and replace placeholders.

```json
{
  "log": { "level": "info" },
  "inbounds": [
    {
      "type": "vless",
      "tag": "vless-in",
      "listen": "::",
      "listen_port": 443,
      "users": [ { "uuid": "REPLACE_VLESS_UUID", "flow": "none" } ],
      "tls": {
        "enabled": true,
        "server_name": "www.cloudflare.com",
        "reality": {
          "enabled": true,
          "handshake": { "server": "www.cloudflare.com", "server_port": 443 },
          "private_key": "REPLACE_REALITY_PRIVATE_KEY",
          "short_id": [ "a1b2c3d4" ]
        }
      }
    }
  ],
  "outbounds": [
    { "type": "direct", "tag": "direct" },
    {
      "type": "wireguard",
      "tag": "warp",
      "server": "REPLACE_WARP_ENDPOINT_IP",
      "server_port": REPLACE_WARP_ENDPOINT_PORT,
      "local_address": [ "REPLACE_WGCF_IPV4/32", "REPLACE_WGCF_IPV6/128" ],
      "private_key": "REPLACE_WGCF_PRIVATE_KEY",
      "peer_public_key": "REPLACE_WARP_PEER_PUBLIC_KEY",
      "reserved": [ REPLACE_A, REPLACE_B, REPLACE_C ],
      "mtu": 1280,
      "workers": 2
    }
  ],
  "route": {
    "rules": [
      { "domain_suffix": ["anthropic.com", "claude.ai"], "outbound": "warp" },
      { "domain_suffix": ["openai.com"], "outbound": "warp" }
    ],
    "final": "direct"
  }
}
```

Enable service（开机自启）
```bash
sudo sing-box check -c /usr/local/etc/sing-box/config.json
sudo tee /etc/systemd/system/sing-box.service >/dev/null <<'EOF'
[Unit]
Description=sing-box service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/sing-box -c /usr/local/etc/sing-box/config.json
Restart=always
RestartSec=3s
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now sing-box
sudo systemctl status sing-box | cat
```

UFW（如启用防火墙）
```bash
sudo ufw allow 443/tcp && sudo ufw reload
```

### 5) Windows — Clash Verge Rev profile（客户端）
Add this proxy entry (Clash.Meta syntax). Replace placeholders and add to a proxy‑group.

```yaml
proxies:
  - name: HH-VLESS-REALITY
    type: vless
    server: YOUR_VPS_IP
    port: 443
    uuid: REPLACE_VLESS_UUID
    network: tcp
    udp: true
    tls: true
    servername: www.cloudflare.com
    flow: ""
    reality-opts:
      public-key: REPLACE_REALITY_PUBLIC_KEY
      short-id: a1b2c3d4
    client-fingerprint: chrome
```

No client‑side routing is required; server already splits egress to WARP for AI domains.

### 6) Validate（自检）
- General IP: open `https://ifconfig.me` → should be VPS IP
- AI IP: open `https://chat.openai.com/cdn-cgi/trace` → `warp=on` and IP differs
- Logs: `journalctl -u sing-box -n 200 | cat`

### 7) Troubleshooting（排错）
- TLS handshake/403: switch `server_name/handshake.server` to another TLS1.3 site (e.g. `www.microsoft.com`) and mirror on client
- AI still blocked: fix domain list spelling; ensure WARP fields (endpoint, peer key, reserved) correct
- Packet loss at night: consider CN2/GIA entrance VPS or move region; WARP remains server‑side only

### 8) When to use WebSocket?（何时用WS）
- Need CDN fronting/域名托管（如Cloudflare前置）
- ISP only opens HTTP/WS ports
- Otherwise prefer REALITY (simpler, stealthier, no域名)

### 9) About xhttp（xhttp 简述）
- What: HTTP‑like transport aiming at higher realism（更像真HTTP）
- Status: limited client support; Clash/Mihomo generally not ready
- Recommendation: stick to REALITY now; revisit when your client adds xhttp

### 10) Extend split‑egress（可扩展分流）
Add more domains to the `route.rules` list as needed, e.g. `cohere.ai`, `perplexity.ai`, `huggingface.co`, `openrouter.ai`, `*.azure.com`.

---

Checklist（操作清单）
- [ ] Provider panel + ufw: open TCP 443
- [ ] Replace placeholders in `config.json` (UUID, REALITY keys, WARP fields)
- [ ] Enable service：`systemctl enable --now sing-box`
- [ ] Import Clash proxy and select it
- [ ] Verify normal sites出VPS、AI域名出WARP


