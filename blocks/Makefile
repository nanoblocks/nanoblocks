Default: ;@:

TARGETS=popup link

$(TARGETS): in=$(firstword $(wildcard $@/index.styl $@/$@.styl))
$(TARGETS):
	stylus $(in)


.PHONY: Default $(TARGETS)
