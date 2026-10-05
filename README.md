# Controle Dois Cardápio

Cardápio digital para o cliente final (estilo iFood), projeto separado do painel, do PDV e do quadro de pedidos. Usa as rotas públicas `/connect/delivery/:linkUrl` da API do Controle Dois.

- Endereço da loja: `/<link da loja>` (o link é o slug definido em Configurações > Loja Online), por exemplo `/planetaconveniencia`.
- Fluxo: cardápio por categoria com busca, produto com complementos, sacola, login por código no WhatsApp, endereço com CEP e taxa por bairro, pagamento na entrega/retirada e acompanhamento do pedido (atualiza a cada 20 s).
- Sem foto o produto aparece com um ícone neutro.
- `VITE_DEFAULT_SLUG` (opcional) abre uma loja direto na raiz do domínio.

```bash
npm install
npm run dev     # http://localhost:5176
npm run build
```

`VITE_API_URL` aponta a API (padrão `http://localhost:3333`; produção em `.env.production`).
