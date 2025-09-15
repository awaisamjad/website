server_ip := env_var("MY_SERVER_IP")
deploy:
		bun run build
		rsync -azP --delete dist/ awais@{{ server_ip }}:/home/awais/website
