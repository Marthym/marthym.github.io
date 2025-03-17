
themes/ght1pc9kc/node_modules:
	cd themes/ght1pc9kc && \
		npm ci --unsafe-perm

themes/ght1pc9kc/static/main.css: themes/ght1pc9kc/node_modules
	cd themes/ght1pc9kc && \
		npx @tailwindcss/cli -i src/syntax.css -o static/syntax.css --minify
	cd themes/ght1pc9kc && \
		npx @tailwindcss/cli -i src/main.css -o static/main.css --minify

build: themes/ght1pc9kc/static/main.css

serve: themes/ght1pc9kc/static/main.css
	docker run -u $(shell id -u):$(shell id -g) -it --rm -p 1313:1313 -v "$$PWD:/src" \
		hugomods/hugo:base-0.145.0 \
		hugo server --buildFuture --buildDrafts --bind 0.0.0.0

clean:
	rm -rf themes/ght1pc9kc/static
	rm -rf themes/ght1pc9kc/node_modules
	rm -rf public

list:
	make -npq : 2> /dev/null | awk -v RS= -F: '$$1 ~ /^[^#%.]+$$/ { print $$1 }' | sort -u
