# Manual de Operação Local e Manutenção de TI

## Variáveis de Ambiente (.env)
- `CNPJA_API_KEY`: Chave de autenticação na API CNPJá.
- `DATABASE_PATH`: Caminho do arquivo SQLite (Padrão: `./data/app.sqlite`).
- `DEFAULT_MAX_AGE_DAYS`: Tempo máximo em dias do cache de consulta (Padrão: 45).

## Manutenção do Banco de Dados
Para realizar o backup manual da base de dados, copie o arquivo `./data/app.sqlite` ou utilize a funcionalidade de exportação de snapshot na aba "Sincronização Nuvem" do sistema.
