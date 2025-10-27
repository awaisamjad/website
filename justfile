server_ip := env_var("MY_SERVER_IP")
deploy:
		bun run build
		rsync -azP --delete dist/ awais@{{ server_ip }}:/var/www/awais.me/html/
		rsync -azP --delete dist/ awais@{{ server_ip }}:/var/www/volk.awais.me/html/
