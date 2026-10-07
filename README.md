# BotHost Cloud

Versão preparada para Koyeb e Render.

## Arquivos
- `bothost.js` — aplicação inteira.
- `package.json` — necessário para o build/start automático da plataforma.

## Start
`npm start`

## Variáveis de ambiente
- `PORT` — fornecida automaticamente pela plataforma.
- `HOST` — padrão `0.0.0.0`.
- `ADMIN_USER` — usuário do painel. Padrão: `admin`.
- `ADMIN_PASSWORD` — senha do painel. **Defina uma senha forte antes de publicar.**

## Importante
Esta versão não usa Docker. Os bots Python/Node são executados como processos filhos do servidor.
Isso é adequado para um protótipo/painel pessoal, mas não oferece isolamento de segurança entre usuários.

O armazenamento local da aplicação pode ser efêmero nas camadas gratuitas. Não trate os arquivos dos bots como armazenamento permanente.

O recurso de terminal executa comandos no ambiente da aplicação. Portanto, não publique este painel para usuários não confiáveis sem adicionar autenticação multiusuário, sandbox/isolamento e limites de recursos.
