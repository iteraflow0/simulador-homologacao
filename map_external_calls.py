import os, sys, json
sys.path.insert(0, r"D:\Iteraflow\Antigravity IDE\treinamento-ia\SCRIPTS_TESTE\replay_modelos")
import n8n_api

WF_IDS = [
    "psI61ZFDnWMclYKi", "ilUFTCzRJXLcSiai", "UpquqROeshxKkoe5", "s0BL5GCjl9XRMXzK",
    "DKlbuUZJMQMIjLlc", "l2Xfmjg50pdgab6K", "LJdgintziqnHricP", "NfIxvZfCrQTu5muQ",
    "oDNteFuKOh4oh3oV", "eJlE9YFNICkcfcqt", "duDPMwzHegrAfzUX", "QJetQAl4S0Z8Ucso",
    "gPoy31PWlnhaBna3", "J2RcfvFSvXTuubln", "JMqkFqvnKtvyYtmy", "jHAaZo2oR4VAWXfg"
]

def mapear_chamadas_externas():
    chamadas = []
    for wid in WF_IDS:
        wf = n8n_api.get(f"/workflows/{wid}")
        nodes, _ = n8n_api.published(wf)
        for n in nodes:
            ntype = n.get("type", "")
            params = n.get("parameters", {})
            name = n.get("name")
            
            # HTTP Request
            if "httpRequest" in ntype:
                url = str(params.get("url", ""))
                method = params.get("method", "GET")
                chamadas.append((wid, name, method, url))
            
            # Telegram
            if "telegram" in ntype:
                op = params.get("operation", "")
                chamadas.append((wid, name, "TELEGRAM", op))

    print(f"Total de chamadas externas mapeadas: {len(chamadas)}")
    for wid, name, method, url in chamadas:
        print(f"[{wid}] {name:30} {method:8} {url[:100]}")

if __name__ == "__main__":
    mapear_chamadas_externas()
