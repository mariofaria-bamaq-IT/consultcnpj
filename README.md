# Gestão Empresarial & CNPJ

Sistema corporativo para consulta avulsa de CNPJ via API CNPJá, armazenamento e gestão em banco de dados SQLite local, importação em lote de planilhas Excel/CSV, sincronização automática em nuvem e exportação de relatórios em formato PDF e XLS com cabeçalhos formatados.

## 🚀 Funcionalidades Principais

- **Consulta Avulsa de CNPJ (API CNPJá):** Pesquisa em tempo real com Ficha Cadastral completa (QSA, CNAE, Endereço e Contatos) e cache em SQLite local.
- **Banco de Dados SQLite:** Persistência em arquivo local (`./data/app.sqlite`) com operações CRUD completas e busca rápida.
- **Importação de Planilhas (Excel/CSV):** Upload drag-and-drop de arquivos `.xlsx`, `.xls` e `.csv` com pré-visualização de colunas e importação em lote.
- **Sincronização em Nuvem:** Espelhamento automático com verificador de hash e backup em nuvem corporativa (Google Drive/Cloud Vault).
- **Relatórios Formatados (PDF & XLS):** Gerador de relatórios corporativos em PDF (jsPDF) e Excel (SheetJS) com cabeçalhos oficiais, filtros e totais acumulados.

## 🛠️ Como Executar

```bash
# Instalar dependências
npm install

# Iniciar ambiente de desenvolvimento
npm run dev

# Compilar para produção
npm run build

# Iniciar servidor compilado em produção
npm run start
```
