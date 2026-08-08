# Arquitetura Técnica do Sistema

## Stack de Tecnologias
- **Apresentação:** React 19, TypeScript, Tailwind CSS, Lucide Icons, jsPDF + AutoTable, XLSX.
- **Servidor API:** Node.js Express, Multer, Esbuild, TSX.
- **Banco de Dados:** SQLite (sql.js) com persistência em arquivo em `./data/app.sqlite`.

## Fluxo de Dados
1. O usuário requisita consulta por CNPJ.
2. O servidor verifica se o dado existe no banco SQLite local e se possui idade inferior a 45 dias (`DEFAULT_MAX_AGE_DAYS`).
3. Em caso negativo ou se forçado, realiza chamada à API CNPJá utilizando a chave do arquivo `.env` (`CNPJA_API_KEY`).
4. Os dados atualizados são gravados no SQLite local e sinalizados para sincronização em nuvem.
