
_ci:
	cd themes/ght1pc9kc && \
		npm ci --unsafe-perm

browser: _ci
	npx update-browserslist-db@latest

tw:
	cd themes/ght1pc9kc && \
		npx tailwindcss -i src/syntax.css -o static/syntax.css --minify
	cd themes/ght1pc9kc && \
		npx tailwindcss -i src/main.css -o static/main.css --minify

build: _ci tw

serve:
	docker run -it --rm -p 1313:1313 -v "$$PWD:/src" \
		hugomods/hugo:base-0.121.2 \
		hugo server --buildFuture --buildDrafts --bind 0.0.0.0

list:
	make -npq : 2> /dev/null | awk -v RS= -F: '$$1 ~ /^[^#%.]+$$/ { print $$1 }' | sort -u
