# DIRETRIZES TÉCNICAS E REGRAS DE ARQUITETURA DE TI — CUBOSOFT 2.0

## Visão Geral do Padrão Corporativo
Toda solução corporativa mantida pela TI deve seguir rigorosamente as normas abaixo:

1. **Frontend:** React 19 com TypeScript, Tailwind CSS e componentes modulares.
2. **Backend:** Node.js com Express e API REST estruturada. A lógica crítica de negócio e o controle de dados permanecem no backend, nunca apenas no navegador.
3. **Persistência de Dados:** Banco de dados SQLite persistido no arquivo local (`data/app.sqlite`) e sincronizado automaticamente com cofre de nuvem corporativo.
4. **Segurança de Credenciais:** Nenhuma chave de API, senha ou token gravado diretamente no código-fonte. Chaves mantidas em variáveis de ambiente (`.env` / `CNPJA_API_KEY`).
5. **Auditoria e Observabilidade:** Logs estruturados de consultas e operações de sincronização registrados e auditáveis.
6. **Relatórios:** Capacidade de geração de relatórios oficiais formatados em PDF e XLSX com cabeçalho da organização e sumário de dados.
