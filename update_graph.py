import json
import os

graph_path = "/Users/arthurdemoraespd/Documents/obsidian/second brain/.obsidian/graph.json"

with open(graph_path, 'r') as f:
    data = json.load(f)

# Definir grupos de cores baseados nas tags inseridas no frontmatter
data['colorGroups'] = [
    {
        "query": "path:\"Quark SaaS/🎨 Frontend\"",
        "color": {"a": 1, "rgb": 3900150} # Azul (#3b82f6)
    },
    {
        "query": "path:\"Quark SaaS/⚙️ Backend\"",
        "color": {"a": 1, "rgb": 15680580} # Vermelho (#ef4444)
    },
    {
        "query": "path:\"Quark SaaS/🗄️ Banco de Dados\"",
        "color": {"a": 1, "rgb": 1096065} # Esmeralda (#10b981) - Supabase
    },
    {
        "query": "path:\"Quark SaaS/🔧 DevOps\"",
        "color": {"a": 1, "rgb": 16347926} # Laranja (#f97316)
    },
    {
        "query": "path:\"Quark SaaS/🤖 Agentes\"",
        "color": {"a": 1, "rgb": 9133302} # Roxo IA (#8b5cf6)
    },
    {
        "query": "path:\"Quark SaaS/📐 Arquitetura\"",
        "color": {"a": 1, "rgb": 10741301} # Verde Lima Quark (#a3e635)
    },
    {
        "query": "path:\"Quark SaaS/💡 Decisões\" OR path:\"Quark SaaS/📋 Changelog\"",
        "color": {"a": 1, "rgb": 440020} # Ciano (#06b6d4)
    },
    {
        "query": "file:\"🏠 Home.md\"",
        "color": {"a": 1, "rgb": 16777215} # Branco para destaque
    }
]

with open(graph_path, 'w') as f:
    json.dump(data, f, indent=2)

print("graph.json updated successfully.")
