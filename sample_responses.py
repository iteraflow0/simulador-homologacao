import sys, json
sys.path.insert(0, r"D:\Iteraflow\Antigravity IDE\treinamento-ia\SCRIPTS_TESTE\replay_modelos")
import n8n_api

def amostra_execucao():
    # 1. ilUFTCzRJXLcSiai (Entrega)
    print("Buscando execucoes de Entrega...")
    execs = n8n_api.get("/executions", workflowId="ilUFTCzRJXLcSiai", limit=1)
    if execs.get("data"):
        eid = execs["data"][0]["id"]
        det = n8n_api.get(f"/executions/{eid}")
        data = det.get("data", {}).get("resultData", {}).get("runData", {})
        # Achar enviaTexto
        if "enviaTexto" in data:
            print("Chatwoot enviaTexto output sample:")
            print(json.dumps(data["enviaTexto"][0]["data"]["main"][0][0]["json"], indent=2)[:500])
    
    # 2. NfIxvZfCrQTu5muQ (Melhor Envio)
    print("\nBuscando execucoes de Calcular Entrega...")
    execs_me = n8n_api.get("/executions", workflowId="NfIxvZfCrQTu5muQ", limit=1)
    if execs_me.get("data"):
        eid_me = execs_me["data"][0]["id"]
        det_me = n8n_api.get(f"/executions/{eid_me}")
        data_me = det_me.get("data", {}).get("resultData", {}).get("runData", {})
        if "calcular_frete (Melhor Envio)" in data_me:
            print("Melhor Envio output sample:")
            print(json.dumps(data_me["calcular_frete (Melhor Envio)"][0]["data"]["main"][0][0]["json"], indent=2)[:500])

if __name__ == "__main__":
    amostra_execucao()
