import sys, json
sys.path.insert(0, r"D:\Iteraflow\Antigravity IDE\treinamento-ia\SCRIPTS_TESTE\replay_modelos")
import n8n_api

execs = n8n_api.get("/executions", limit=20)
for e in execs.get("data", []):
    eid = e["id"]
    wid = e.get("workflowId")
    if wid in ["psI61ZFDnWMclYKi", "ilUFTCzRJXLcSiai", "DKlbuUZJMQMIjLlc", "LJdgintziqnHricP"]:
        det = n8n_api.get(f"/executions/{eid}", includeData="true")
        rd = det.get("data", {}).get("resultData", {}).get("runData", {})
        if "Buscar Historico Chatwoot" in rd or "enviaTexto" in rd or "Postar Nota Interna Chatwoot" in rd:
            print(f"Execucao interessante achada: {eid} (wf: {wid})")
            for k in ["Buscar Historico Chatwoot", "enviaTexto", "Postar Nota Interna Chatwoot"]:
                if k in rd:
                    item = rd[k][0]["data"]["main"][0][0]["json"]
                    print(f"No {k} saida:")
                    print(json.dumps(item, indent=2)[:400])
            break
