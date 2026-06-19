.PHONY: doctor check syntax seo-check validate-ci install-local

doctor:
	node scripts/sv2.js doctor

check:
	node scripts/sv2.js pr-ready

syntax:
	node scripts/sv2.js check-syntax

seo-check:
	node scripts/sv2.js seo --check

validate-ci:
	node scripts/sv2.js validate --no-write --json

install-local:
	mkdir -p "$$HOME/.local/bin"
	ln -sf "$(CURDIR)/scripts/sv2.js" "$$HOME/.local/bin/sv2"
	chmod +x "$$HOME/.local/bin/sv2"
	@echo "Installed sv2 -> $$HOME/.local/bin/sv2"
