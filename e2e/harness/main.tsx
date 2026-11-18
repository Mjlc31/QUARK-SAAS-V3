// Harness de E2E (só dev; não entra no build): monta o modal real e aponta as chamadas de
// /api/contratos para o backend informado em ?api= (rotas Express reais com Supabase falso).
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { GenerateContractModal } from "@/components/contracts/GenerateContractModal";
import "@/index.css";

const params = new URLSearchParams(location.search);
const api = params.get("api") || "";
const backend: string = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return nativeFetch(api && url.startsWith(backend) ? api + url.slice(backend.length) : input, init);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <GenerateContractModal proposalId={params.get("proposta") || "p1"} open onClose={() => {}} />
    <Toaster />
  </>,
);
