import sys, json
sys.path.insert(0, r"D:\Iteraflow\Antigravity IDE\treinamento-ia\SCRIPTS_TESTE\replay_modelos")
import n8n_api

det = n8n_api.get("/executions/151067", includeData=True)
run_data = det.get("data", {}).get("resultData", {}).get("runData", {})
print("Nos executados em 151067 com includeData:", list(run_data.keys()))

for k in ["Buscar Historico Chatwoot", "Ler Etiquetas Atuais"]:
    if k in run_data:
        print(f"\n--- No: {k} ---")
        items = run_data[k][0]["data"]["main"][0]
        print(f"Total itens: {len(items)}")
        print(json.dumps(items[0]["json"], indent=2)[:500])
