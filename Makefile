# know-as-ui 本地预览
PORT    ?= 8000
URL      = http://localhost:$(PORT)/
PIDFILE  = .http-server.pid

.PHONY: open serve stop seo llms help

help: ## 显示可用命令
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F'## ' '{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

open: ## 一键启动本地服务器并打开页面（已运行则直接打开）
	@if ! curl -s -o /dev/null --max-time 2 --noproxy '*' $(URL); then \
		echo ">> 启动本地预览 :$(PORT) ..."; \
		python3 scripts/serve.py $(PORT) >/dev/null 2>&1 & \
		echo $$! > $(PIDFILE); \
		sleep 1; \
	else \
		echo ">> 服务器已在 :$(PORT) 运行"; \
	fi
	@echo ">> 打开 $(URL)"
	@open $(URL)

serve: ## 前台运行服务器（Ctrl+C 退出，适合调试）
	python3 scripts/serve.py $(PORT)

stop: ## 停止后台服务器（make open 启动的那个）
	@if [ -f $(PIDFILE) ]; then \
		kill $$(cat $(PIDFILE)) 2>/dev/null; rm -f $(PIDFILE); \
		echo ">> 已停止后台服务器"; \
	else \
		echo ">> 没有运行中的后台服务器"; \
	fi

seo: ## 更新 SEO、目录、sitemap，并生成每页 llms.txt（首次先 npm install）
	node scripts/seo.mjs
	node scripts/llms.mjs

llms: ## 只重新生成每页 llms.txt（需要本机 Chrome，可用 CHROME_PATH 覆盖）
	node scripts/llms.mjs
