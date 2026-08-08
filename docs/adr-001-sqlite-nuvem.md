# ADR 001: Adoção do Banco SQLite com Sincronização em Nuvem

## Status
Aprovado

## Contexto
O projeto necessitava de um armazenamento de dados rápido, que permitisse operação offline/local, sem complexidade de instalação de servidores adicionais de banco de dados no ambiente de protótipo e homologação, mantendo no entanto a sincronização com a nuvem.

## Decisão
Adotar o SQLite mantido no sistema de arquivos local (`./data/app.sqlite`) gerenciado pelo servidor Express backend, associado a um barramento de sincronização automática com o cofre corporativo em nuvem.

## Consequências
- Tempo de resposta sub-milissegundo para consultas locais.
- Zero dependência externa para inicialização do protótipo.
- Total integridade dos dados e facilidade de backup físico.
