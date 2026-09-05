# SEGEMPAT — Roadmap

## Pronto no projeto
- [x] Schema MySQL 8 completo (`database/mysql/001_schema.sql`)
- [x] API SEGEMPAT com todos os módulos (`server/src`)
- [x] Scripts: preflight, migrate, smoke, bootstrap-admin, cutover:audit
- [x] Pacote de implantação: Dockerfile, docker-compose, serviço systemd, proxy Nginx
- [x] Documento de entrega para a TI (`ENTREGA_TI.md`)

## Depende da TI
- [ ] Criar database/usuário MySQL corporativo e liberar rede
- [ ] Publicar a API em HTTPS interno e rodar preflight/migrate/smoke
- [ ] Informar a URL da API para configurar `VITE_SEGEMPAT_API_URL`
- [ ] Homologar ponta a ponta (`CORPORATE_HOMOLOGATION_CHECKLIST.md`)
- [ ] Retirar o adaptador legado após homologação aprovada
