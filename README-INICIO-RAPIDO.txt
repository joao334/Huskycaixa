HUSKY CAIXA - INÍCIO RÁPIDO

ESTA VERSÃO ESTÁ PREPARADA PARA:
- LOGIN EM NUVEM NO PC E NO CELULAR
- INSTALAÇÃO COMO ATALHO / APP NA TELA INICIAL DO CELULAR
- ENVIO DE COMPROVANTES PIX PARA O STORAGE DA NUVEM

ACESSO EM NUVEM
1. Abra o sistema com internet.
2. Execute o arquivo SUPABASE-SETUP.sql no seu projeto Supabase.
3. Crie os logins pela própria tela inicial do sistema.
4. O mesmo login pode ser usado no PC e no celular ao mesmo tempo.
5. Os dados do sistema são sincronizados pelo workspace: husky-principal.

COMPROVANTES PIX EM NUVEM
- Os comprovantes enviados na venda ou na tela de comprovantes podem ir para o bucket: husky-files
- Imagens grandes são otimizadas antes do envio para ajudar no espaço.
- O arquivo SQL já cria o bucket e as permissões básicas para upload, leitura e exclusão.

ATALHO NA TELA INICIAL
ANDROID
- Abra o sistema no Chrome ou Edge
- Toque no botão "Adicionar à tela inicial" dentro do sistema
- Se o navegador não abrir a instalação automática, use o menu do navegador e escolha "Instalar app" ou "Adicionar à tela inicial"

IPHONE
- Abra o sistema no Safari
- Toque em Compartilhar
- Escolha "Adicionar à Tela de Início"

IMPORTANTE
- Esta versão está configurada para modo de nuvem.
- Para sincronização compartilhada funcionar 100%, o projeto Supabase precisa ter a estrutura do arquivo SUPABASE-SETUP.sql.
- O atalho/app no celular funciona melhor em HTTPS ou localhost. Se abrir o HTML solto, a instalação pode não aparecer.
- A quantidade total de armazenamento depende do projeto/plano do seu Supabase.

RECOMENDAÇÃO DE USO
- No computador, prefira abrir por servidor local ou hospedar o site.
- Para testar rápido no Windows, use o arquivo INICIAR-SERVIDOR-LOCAL.bat.
- No celular, publique o site ou abra pelo mesmo endereço da rede do computador.

ARQUIVOS IMPORTANTES
- js/env.js -> credenciais e modo de autenticação
- SUPABASE-SETUP.sql -> estrutura do banco, sync e storage
- manifest.webmanifest -> configuração do app instalável
- sw.js -> service worker do atalho/app
- INICIAR-SERVIDOR-LOCAL.bat -> sobe um servidor local simples na porta 8080
