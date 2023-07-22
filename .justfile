default:
    just --list

serve:
	hugo server --buildFuture --buildDrafts

_ci:
	cd themes/ght1pc9kc && \
		npm ci --unsafe-perm

tw:
	cd themes/ght1pc9kc && \
		npx tailwindcss -i src/syntax.css -o static/syntax.css --minify
	cd themes/ght1pc9kc && \
		npx tailwindcss -i src/main.css -o static/main.css --minify

build: _ci tw
